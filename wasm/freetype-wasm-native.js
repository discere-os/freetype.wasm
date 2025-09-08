/**
 * FreeType WASM-Native JavaScript API
 * Truly WASM-native font system with persistent caching, async loading, and CDN integration
 */

class FreeTypeWASMNative {
    constructor(wasmModule) {
        this.module = wasmModule;
        this.library = 0; // FT_Library handle
        this.fonts = new Map(); // fontId -> FT_Face mapping
        this.glyphCache = new Map(); // Persistent glyph cache
        this.fontCache = new Map(); // Font metadata cache
        this.loadingQueue = new Map(); // Track font loading operations
        
        this.isInitialized = false;
        this.idbfsReady = false;
        
        // WASM-native configuration
        this.config = {
            persistentCache: true,
            asyncLoading: true,
            cdnSupport: true,
            fontPackages: true,
            webWorkerSupport: true,
            maxCacheSize: 100, // Max fonts in persistent cache
            defaultFontPath: '/fonts',
            cachePath: '/font-cache'
        };
    }
    
    /**
     * Initialize the WASM-native FreeType system with persistent storage
     * @returns {Promise<boolean>} Success status
     */
    async initialize(options = {}) {
        if (this.isInitialized) return true;
        
        Object.assign(this.config, options);
        
        try {
            // Initialize FreeType library
            const libraryPtr = this.module._malloc(4);
            const error = this.module.ccall('FT_Init_FreeType', 'number', ['number'], [libraryPtr]);
            
            if (error !== 0) {
                throw new Error(`FreeType initialization failed: ${this.getErrorString(error)}`);
            }
            
            this.library = this.module.getValue(libraryPtr, 'i32');
            this.module._free(libraryPtr);
            
            // Set up WASM-native file system
            await this.initializeFileSystem();
            
            // Load font metadata cache
            await this.loadFontCache();
            
            this.isInitialized = true;
            console.log('✅ FreeType WASM-Native initialized successfully');
            console.log(`📁 Persistent cache: ${this.config.persistentCache ? 'enabled' : 'disabled'}`);
            console.log(`🌐 CDN support: ${this.config.cdnSupport ? 'enabled' : 'disabled'}`);
            
            return true;
            
        } catch (e) {
            console.error('❌ FreeType WASM-Native initialization failed:', e);
            return false;
        }
    }
    
    /**
     * Initialize WASM-native file system with IDBFS persistent storage
     */
    async initializeFileSystem() {
        const FS = this.module.FS;
        
        // Create virtual font directories
        FS.mkdir(this.config.defaultFontPath);
        FS.mkdir(this.config.cachePath);
        FS.mkdir('/system-fonts');
        FS.mkdir('/user-fonts');
        FS.mkdir('/cdn-fonts');
        
        // Mount IDBFS for persistent font caching
        if (this.config.persistentCache && typeof indexedDB !== 'undefined') {
            try {
                FS.mount(FS.filesystems.IDBFS, {}, this.config.cachePath);
                
                // Synchronize with IndexedDB
                await new Promise((resolve, reject) => {
                    FS.syncfs(true, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                this.idbfsReady = true;
                console.log('✅ IDBFS persistent cache mounted successfully');
                
            } catch (e) {
                console.warn('⚠️ IDBFS mounting failed, using MEMFS:', e);
                this.config.persistentCache = false;
            }
        }
        
        console.log('📁 Virtual font directory structure created');
    }
    
    /**
     * Load font metadata from persistent cache
     */
    async loadFontCache() {
        if (!this.idbfsReady) return;
        
        try {
            const FS = this.module.FS;
            const cacheFile = `${this.config.cachePath}/font-metadata.json`;
            
            if (FS.analyzePath(cacheFile).exists) {
                const data = FS.readFile(cacheFile, { encoding: 'utf8' });
                this.fontCache = new Map(JSON.parse(data));
                console.log(`📋 Loaded ${this.fontCache.size} font entries from cache`);
            }
        } catch (e) {
            console.warn('⚠️ Font cache loading failed:', e);
        }
    }
    
    /**
     * Save font metadata to persistent cache
     */
    async saveFontCache() {
        if (!this.idbfsReady) return;
        
        try {
            const FS = this.module.FS;
            const cacheFile = `${this.config.cachePath}/font-metadata.json`;
            const data = JSON.stringify([...this.fontCache.entries()]);
            
            FS.writeFile(cacheFile, data);
            
            // Persist to IndexedDB
            await new Promise((resolve, reject) => {
                FS.syncfs(false, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            
            console.log(`💾 Saved ${this.fontCache.size} font entries to persistent cache`);
        } catch (e) {
            console.warn('⚠️ Font cache saving failed:', e);
        }
    }
    
    /**
     * Load font from URL with persistent caching
     * @param {string} fontUrl URL to font file
     * @param {string} fontId Unique identifier for this font
     * @param {Object} options Loading options
     * @returns {Promise<boolean>} Success status
     */
    async loadFontFromUrl(fontUrl, fontId, options = {}) {
        if (!this.isInitialized) {
            throw new Error('FreeType not initialized. Call initialize() first.');
        }
        
        // Check if already loaded
        if (this.fonts.has(fontId)) {
            console.log(`📎 Font '${fontId}' already loaded`);
            return true;
        }
        
        // Check if loading is in progress
        if (this.loadingQueue.has(fontId)) {
            console.log(`⏳ Font '${fontId}' is already loading, waiting...`);
            return await this.loadingQueue.get(fontId);
        }
        
        // Create loading promise
        const loadingPromise = this._loadFontFromUrlInternal(fontUrl, fontId, options);
        this.loadingQueue.set(fontId, loadingPromise);
        
        try {
            const result = await loadingPromise;
            this.loadingQueue.delete(fontId);
            return result;
        } catch (e) {
            this.loadingQueue.delete(fontId);
            throw e;
        }
    }
    
    /**
     * Internal font loading implementation with caching
     */
    async _loadFontFromUrlInternal(fontUrl, fontId, options) {
        const FS = this.module.FS;
        const cacheKey = `${fontId}_${this.hashUrl(fontUrl)}`;
        const cachedPath = `${this.config.cachePath}/${cacheKey}.ttf`;
        const virtualPath = `/cdn-fonts/${fontId}.ttf`;
        
        try {
            // Check persistent cache first
            if (this.idbfsReady && FS.analyzePath(cachedPath).exists) {
                console.log(`📂 Loading font '${fontId}' from persistent cache`);
                
                // Copy from cache to working directory
                const cachedData = FS.readFile(cachedPath);
                FS.writeFile(virtualPath, cachedData);
                
                return await this.loadFontFromPath(virtualPath, fontId);
            }
            
            // Download font asynchronously
            console.log(`🌐 Downloading font '${fontId}' from ${fontUrl}`);
            
            await new Promise((resolve, reject) => {
                const onLoad = (response) => {
                    try {
                        // Write to virtual file system
                        FS.writeFile(virtualPath, new Uint8Array(response));
                        
                        // Save to persistent cache
                        if (this.idbfsReady) {
                            FS.writeFile(cachedPath, new Uint8Array(response));
                            // Async persist to IndexedDB (don't block)
                            FS.syncfs(false, () => {}); 
                        }
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                };
                
                const onError = () => {
                    reject(new Error(`Failed to download font from ${fontUrl}`));
                };
                
                const onProgress = (loaded, total) => {
                    if (options.onProgress && total > 0) {
                        options.onProgress(loaded / total, fontId);
                    }
                };
                
                // Use Emscripten's async wget
                this.module.ccall('emscripten_async_wget_data', null,
                    ['string', 'number', 'number', 'number'], 
                    [fontUrl, onLoad, onError, onProgress]
                );
            });
            
            // Load the downloaded font
            const success = await this.loadFontFromPath(virtualPath, fontId);
            
            if (success) {
                // Update metadata cache
                this.fontCache.set(fontId, {
                    url: fontUrl,
                    cacheKey: cacheKey,
                    loadedAt: Date.now(),
                    size: FS.stat(virtualPath).size
                });
                
                // Persist metadata
                await this.saveFontCache();
                
                console.log(`✅ Font '${fontId}' loaded and cached successfully`);
            }
            
            return success;
            
        } catch (e) {
            console.error(`❌ Font loading failed for '${fontId}':`, e);
            return false;
        }
    }
    
    /**
     * Load multiple fonts from a package (ZIP or preloaded data)
     * @param {string|ArrayBuffer} packageSource URL or buffer containing font package
     * @param {string} packageName Name for this font package
     * @returns {Promise<string[]>} Array of loaded font IDs
     */
    async loadFontPackage(packageSource, packageName) {
        if (!this.isInitialized) {
            throw new Error('FreeType not initialized. Call initialize() first.');
        }
        
        console.log(`📦 Loading font package '${packageName}'...`);
        
        try {
            const FS = this.module.FS;
            const packagePath = `/packages/${packageName}`;
            FS.mkdir('/packages');
            FS.mkdir(packagePath);
            
            // If it's a URL, download first
            if (typeof packageSource === 'string') {
                await new Promise((resolve, reject) => {
                    this.module.ccall('emscripten_async_wget', null,
                        ['string', 'string', 'number', 'number'],
                        [packageSource, `${packagePath}/package.data`, resolve, reject]
                    );
                });
            }
            
            // Mount the package using Emscripten's file packager format
            // This would work with packages created using emscripten's file_packager
            const loadedFonts = [];
            
            // Scan for font files in the package
            const files = FS.readdir(packagePath);
            for (const file of files) {
                if (file.endsWith('.ttf') || file.endsWith('.otf') || file.endsWith('.woff')) {
                    const fontId = `${packageName}_${file.replace(/\.[^/.]+$/, "")}`;
                    const fontPath = `${packagePath}/${file}`;
                    
                    if (await this.loadFontFromPath(fontPath, fontId)) {
                        loadedFonts.push(fontId);
                    }
                }
            }
            
            console.log(`✅ Font package '${packageName}' loaded with ${loadedFonts.length} fonts`);
            return loadedFonts;
            
        } catch (e) {
            console.error(`❌ Font package loading failed for '${packageName}':`, e);
            return [];
        }
    }
    
    /**
     * Load font from Google Fonts with automatic caching
     * @param {string} fontFamily Google Fonts family name (e.g., 'Inter', 'Roboto')
     * @param {Object} options Font variant options
     * @returns {Promise<string>} Font ID if successful
     */
    async loadGoogleFont(fontFamily, options = {}) {
        const {
            variants = ['regular'],
            subsets = ['latin'],
            display = 'swap'
        } = options;
        
        console.log(`🔤 Loading Google Font '${fontFamily}'...`);
        
        try {
            // Construct Google Fonts API URL
            const variantStr = variants.join(',');
            const subsetStr = subsets.join(',');
            const apiUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${variantStr}&subset=${subsetStr}&display=${display}`;
            
            // Fetch CSS to get font URLs
            const response = await fetch(apiUrl);
            const cssText = await response.text();
            
            // Extract font URLs from CSS
            const fontUrls = this.extractFontUrlsFromCSS(cssText);
            const loadedFonts = [];
            
            for (const [variant, url] of fontUrls) {
                const fontId = `${fontFamily.toLowerCase().replace(/\s+/g, '-')}-${variant}`;
                
                if (await this.loadFontFromUrl(url, fontId)) {
                    loadedFonts.push(fontId);
                }
            }
            
            console.log(`✅ Google Font '${fontFamily}' loaded with ${loadedFonts.length} variants`);
            return loadedFonts[0]; // Return primary variant ID
            
        } catch (e) {
            console.error(`❌ Google Font loading failed for '${fontFamily}':`, e);
            return null;
        }
    }
    
    /**
     * Extract font URLs from Google Fonts CSS
     */
    extractFontUrlsFromCSS(cssText) {
        const fontUrls = [];
        const urlPattern = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g;
        const weightPattern = /font-weight:\s*(\d+)/g;
        
        let match;
        let weightIndex = 0;
        const weights = [];
        
        // Extract weights
        while ((match = weightPattern.exec(cssText)) !== null) {
            weights.push(match[1]);
        }
        
        // Extract URLs and match with weights
        weightPattern.lastIndex = 0;
        while ((match = urlPattern.exec(cssText)) !== null) {
            const weight = weights[weightIndex] || 'regular';
            fontUrls.push([weight, match[1]]);
            weightIndex++;
        }
        
        return fontUrls;
    }
    
    /**
     * Create lazy-loaded font that loads on first access (Web Worker compatible)
     * @param {string} fontUrl URL to font file
     * @param {string} fontId Font identifier
     * @returns {Promise<boolean>} Success status
     */
    async createLazyFont(fontUrl, fontId) {
        if (!this.isInitialized) {
            throw new Error('FreeType not initialized. Call initialize() first.');
        }
        
        const FS = this.module.FS;
        const virtualPath = `/lazy-fonts/${fontId}.ttf`;
        
        try {
            FS.mkdir('/lazy-fonts');
            
            // Create lazy file that loads on first read
            FS.createLazyFile('/lazy-fonts', `${fontId}.ttf`, fontUrl, true, false);
            
            console.log(`🔗 Lazy font '${fontId}' created (will load on first use)`);
            return true;
            
        } catch (e) {
            console.error(`❌ Lazy font creation failed for '${fontId}':`, e);
            return false;
        }
    }
    
    /**
     * Load font from file path (already in virtual file system)
     * @param {string} fontPath Path to font file in VFS
     * @param {string} fontId Unique identifier for this font
     * @returns {Promise<boolean>} Success status
     */
    async loadFontFromPath(fontPath, fontId) {
        try {
            const FS = this.module.FS;
            
            // Read font data
            const fontData = FS.readFile(fontPath);
            
            // Allocate memory for font data
            const fontPtr = this.module._malloc(fontData.length);
            this.module.HEAPU8.set(fontData, fontPtr);
            
            // Create FT_Face
            const facePtr = this.module._malloc(4);
            const error = this.module.ccall('FT_New_Memory_Face', 'number',
                ['number', 'number', 'number', 'number', 'number'],
                [this.library, fontPtr, fontData.length, 0, facePtr]);
                
            if (error !== 0) {
                this.module._free(fontPtr);
                this.module._free(facePtr);
                throw new Error(`Font loading failed: ${this.getErrorString(error)}`);
            }
            
            const face = this.module.getValue(facePtr, 'i32');
            this.fonts.set(fontId, { 
                face: face, 
                dataPtr: fontPtr, 
                facePtr: facePtr,
                path: fontPath,
                size: fontData.length
            });
            
            return true;
            
        } catch (e) {
            console.error(`❌ Font loading failed for '${fontId}':`, e);
            return false;
        }
    }
    
    /**
     * Get list of available fonts with metadata
     * @returns {Array} Array of font metadata objects
     */
    getAvailableFonts() {
        const fonts = [];
        
        for (const [fontId, fontData] of this.fonts) {
            const cached = this.fontCache.get(fontId);
            fonts.push({
                id: fontId,
                loaded: true,
                size: fontData.size,
                path: fontData.path,
                cached: cached ? {
                    url: cached.url,
                    loadedAt: cached.loadedAt,
                    cacheKey: cached.cacheKey
                } : null
            });
        }
        
        return fonts;
    }
    
    /**
     * Clear font cache and cleanup
     * @param {boolean} persistent Whether to also clear persistent storage
     */
    async clearCache(persistent = false) {
        console.log(`🧹 Clearing font cache (persistent: ${persistent})`);
        
        // Clear in-memory caches
        this.glyphCache.clear();
        this.fontCache.clear();
        this.loadingQueue.clear();
        
        if (persistent && this.idbfsReady) {
            const FS = this.module.FS;
            
            try {
                // Remove cached font files
                const files = FS.readdir(this.config.cachePath);
                for (const file of files) {
                    if (file !== '.' && file !== '..') {
                        FS.unlink(`${this.config.cachePath}/${file}`);
                    }
                }
                
                // Persist changes to IndexedDB
                await new Promise((resolve, reject) => {
                    FS.syncfs(false, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                console.log('✅ Persistent cache cleared');
                
            } catch (e) {
                console.warn('⚠️ Persistent cache clearing failed:', e);
            }
        }
    }
    
    // Inherit other methods from base FreeTypeEngine
    setPixelSize(fontId, pixelSize) {
        const font = this.fonts.get(fontId);
        if (!font) {
            console.error(`Font '${fontId}' not found`);
            return false;
        }
        
        const error = this.module.ccall('FT_Set_Pixel_Sizes', 'number',
            ['number', 'number', 'number'], [font.face, pixelSize, pixelSize]);
            
        return error === 0;
    }
    
    renderGlyph(fontId, charCode, pixelSize) {
        // Implementation similar to base class but with enhanced caching
        const cacheKey = `${fontId}_${charCode}_${pixelSize}`;
        
        if (this.glyphCache.has(cacheKey)) {
            return this.glyphCache.get(cacheKey);
        }
        
        const font = this.fonts.get(fontId);
        if (!font) return null;
        
        try {
            this.setPixelSize(fontId, pixelSize);
            
            const error = this.module.ccall('FT_Load_Char', 'number',
                ['number', 'number', 'number'], [font.face, charCode, 0x4]);
                
            if (error !== 0) return null;
            
            const glyphData = {
                charCode: charCode,
                pixelSize: pixelSize,
                loaded: true,
                cached: true,
                timestamp: Date.now()
            };
            
            this.glyphCache.set(cacheKey, glyphData);
            return glyphData;
            
        } catch (e) {
            console.error(`Error rendering glyph:`, e);
            return null;
        }
    }
    
    /**
     * Enhanced disposal with persistent cache cleanup
     */
    async dispose() {
        console.log('🧹 Disposing FreeType WASM-Native resources...');
        
        // Clean up fonts
        for (const [fontId, font] of this.fonts) {
            this.module.ccall('FT_Done_Face', 'void', ['number'], [font.face]);
            this.module._free(font.dataPtr);
            this.module._free(font.facePtr);
        }
        this.fonts.clear();
        
        // Save final cache state
        if (this.idbfsReady) {
            await this.saveFontCache();
        }
        
        // Clean up library
        if (this.library !== 0) {
            this.module.ccall('FT_Done_FreeType', 'void', ['number'], [this.library]);
            this.library = 0;
        }
        
        // Clear all caches
        this.glyphCache.clear();
        this.fontCache.clear();
        this.loadingQueue.clear();
        
        this.isInitialized = false;
        this.idbfsReady = false;
        
        console.log('✅ FreeType WASM-Native disposed successfully');
    }
    
    // Utility methods
    hashUrl(url) {
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    getErrorString(errorCode) {
        const errors = {
            0: "No error",
            1: "Cannot open resource",
            2: "Unknown file format",
            3: "Broken file",
            4: "Invalid FreeType version",
            5: "Module version too low",
            6: "Invalid argument"
        };
        return errors[errorCode] || "Unknown error";
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeTypeWASMNative;
}
if (typeof window !== 'undefined') {
    window.FreeTypeWASMNative = FreeTypeWASMNative;
}

export default FreeTypeWASMNative;