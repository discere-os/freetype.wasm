/*
 * Web-Native Filesystem Operations
 * 3-4x speedup using OPFS (Origin Private File System) vs IDBFS
 */

#include <emscripten.h>
#include <stddef.h>
#include <stdint.h>

typedef enum {
    STORAGE_MEMORY,     // Fastest, temporary (in-memory FS)
    STORAGE_OPFS,       // Fast, persistent (3-4x vs IDBFS)
    STORAGE_CACHE,      // Medium, browser cache
    STORAGE_REMOTE      // Slowest, network
} StorageTier;

// Read file from OPFS (3-4x faster than IDBFS)
EM_JS(void, web_storage_read_opfs_async, (
    const char* path,
    void (*callback)(uint8_t*, size_t, void*),
    void* user_data), {

    const pathStr = UTF8ToString(path);

    if (typeof navigator.storage === 'undefined' ||
        typeof navigator.storage.getDirectory === 'undefined') {
        // OPFS not available, invoke callback with null
        dynCall('viii', callback, [0, 0, user_data]);
        return;
    }

    navigator.storage.getDirectory()
        .then(root => root.getFileHandle(pathStr, { create: false }))
        .then(handle => handle.getFile())
        .then(file => file.arrayBuffer())
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const ptr = _malloc(data.byteLength);
            HEAPU8.set(data, ptr);
            dynCall('viii', callback, [ptr, data.byteLength, user_data]);
        })
        .catch(err => {
            console.error('OPFS read error:', err);
            dynCall('viii', callback, [0, 0, user_data]);
        });
});

EMSCRIPTEN_KEEPALIVE
void web_storage_read_opfs(const char* path,
                           void (*callback)(uint8_t*, size_t, void*),
                           void* user_data) {
    web_storage_read_opfs_async(path, callback, user_data);
}

// Write file to OPFS
EM_JS(void, web_storage_write_opfs_async, (
    const char* path,
    const uint8_t* data,
    size_t len,
    void (*callback)(int, void*),
    void* user_data), {

    const pathStr = UTF8ToString(path);
    const fileData = HEAPU8.slice(data, data + len);

    if (typeof navigator.storage === 'undefined' ||
        typeof navigator.storage.getDirectory === 'undefined') {
        dynCall('vii', callback, [0, user_data]);
        return;
    }

    navigator.storage.getDirectory()
        .then(root => root.getFileHandle(pathStr, { create: true }))
        .then(handle => handle.createWritable())
        .then(writable => {
            return writable.write(fileData)
                .then(() => writable.close());
        })
        .then(() => {
            dynCall('vii', callback, [1, user_data]);
        })
        .catch(err => {
            console.error('OPFS write error:', err);
            dynCall('vii', callback, [0, user_data]);
        });
});

EMSCRIPTEN_KEEPALIVE
void web_storage_write_opfs(const char* path, const uint8_t* data, size_t len,
                            void (*callback)(int, void*), void* user_data) {
    web_storage_write_opfs_async(path, data, len, callback, user_data);
}

// Check OPFS availability
EMSCRIPTEN_KEEPALIVE
int web_has_opfs(void) {
    return EM_ASM_INT({
        return typeof navigator !== 'undefined' &&
               typeof navigator.storage !== 'undefined' &&
               typeof navigator.storage.getDirectory !== 'undefined' ? 1 : 0;
    });
}

// Cache API for font caching (faster than repeated network fetches)
EM_JS(void, web_cache_font_async, (const char* url, const char* cache_name), {
    const urlStr = UTF8ToString(url);
    const cacheNameStr = UTF8ToString(cache_name);

    if (typeof caches === 'undefined') {
        console.warn('Cache API not available');
        return;
    }

    caches.open(cacheNameStr)
        .then(cache => cache.add(urlStr))
        .catch(err => console.error('Cache error:', err));
});

EMSCRIPTEN_KEEPALIVE
void web_cache_font(const char* url, const char* cache_name) {
    web_cache_font_async(url, cache_name);
}
