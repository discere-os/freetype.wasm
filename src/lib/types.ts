/**
 * Type definitions for freetype.wasm
 */

export interface FreeTypeConfig {
  /** Enable SIMD optimizations (3-5x speedup) */
  enableSIMD?: boolean;
  /** Enable WebGPU acceleration (10x+ speedup) */
  enableWebGPU?: boolean;
  /** Initial memory size in bytes */
  initialMemory?: number;
  /** Maximum memory size in bytes */
  maximumMemory?: number;
}

export interface PerformanceMetrics {
  /** SIMD speedup multiplier (target: 3-5x) */
  simdSpeedup: number;
  /** WebGPU speedup multiplier (target: 10x+) */
  webgpuSpeedup: number;
  /** Workers speedup multiplier (target: 10x) */
  workersSpeedup: number;
  /** Crypto speedup multiplier (target: 5-15x) */
  cryptoSpeedup: number;
}

export interface BrowserRequirements {
  /** Minimum Chrome version */
  chromeMinVersion: number;
  /** Minimum Edge version */
  edgeMinVersion: number;
  /** Requires WASM SIMD */
  requiresSIMD: boolean;
  /** Requires WebGPU */
  requiresWebGPU: boolean;
  /** Requires SharedArrayBuffer */
  requiresSharedArrayBuffer: boolean;
}

export const BROWSER_REQUIREMENTS: BrowserRequirements = {
  chromeMinVersion: 113,
  edgeMinVersion: 113,
  requiresSIMD: true,
  requiresWebGPU: false,  // Optional, depends on build type
  requiresSharedArrayBuffer: true,  // For real threading
};

export interface BuildVariant {
  name: 'minimal' | 'standard' | 'webgpu';
  description: string;
  targetSize: string;
  features: string[];
}

export const BUILD_VARIANTS: BuildVariant[] = [
  {
    name: 'minimal',
    description: 'Smallest size, basic features',
    targetSize: '~2MB',
    features: ['SIMD', 'Basic threading'],
  },
  {
    name: 'standard',
    description: 'Balanced size/performance',
    targetSize: '~4MB',
    features: ['SIMD', 'Threading', 'WebCrypto', 'OPFS'],
  },
  {
    name: 'webgpu',
    description: 'Maximum performance with GPU',
    targetSize: '~6MB',
    features: ['SIMD', 'Threading', 'WebCrypto', 'OPFS', 'WebGPU'],
  },
];

export interface StorageTier {
  name: string;
  speed: 'fastest' | 'fast' | 'medium' | 'slow';
  persistent: boolean;
  description: string;
}

export const STORAGE_TIERS: StorageTier[] = [
  {
    name: 'MEMORY',
    speed: 'fastest',
    persistent: false,
    description: 'In-memory filesystem (temporary)',
  },
  {
    name: 'OPFS',
    speed: 'fast',
    persistent: true,
    description: 'Origin Private File System (3-4x faster than IDBFS)',
  },
  {
    name: 'CACHE',
    speed: 'medium',
    persistent: true,
    description: 'Browser Cache API',
  },
  {
    name: 'REMOTE',
    speed: 'slow',
    persistent: true,
    description: 'Network/CDN storage',
  },
];
