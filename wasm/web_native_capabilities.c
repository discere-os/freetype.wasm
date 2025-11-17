/*
 * Web-Native Capabilities Detection
 * Detects browser features for performance optimizations
 */

#include <stdbool.h>
#include <emscripten.h>

typedef struct {
    bool has_wasm_simd;
    bool has_webgpu;
    bool has_shared_array_buffer;
    bool has_web_crypto;
    bool has_opfs;
    bool has_workers;
    int chrome_version;
} WebCapabilities;

static WebCapabilities g_caps = {0};
static bool g_initialized = false;

EMSCRIPTEN_KEEPALIVE
const WebCapabilities* web_get_capabilities(void) {
    if (!g_initialized) {
        // Detect WASM SIMD support (3-5x speedup for string operations)
        g_caps.has_wasm_simd = EM_ASM_INT({
            try {
                return typeof WebAssembly.validate !== 'undefined' &&
                       WebAssembly.validate(new Uint8Array([
                           0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,
                           10,9,1,7,0,65,0,253,15,26,11
                       ]));
            } catch(e) {
                return 0;
            }
        });

        // Detect WebGPU support (10x+ speedup for GPU operations)
        g_caps.has_webgpu = EM_ASM_INT({
            return typeof navigator !== 'undefined' &&
                   typeof navigator.gpu !== 'undefined' ? 1 : 0;
        });

        // Detect SharedArrayBuffer (required for real threading)
        g_caps.has_shared_array_buffer = EM_ASM_INT({
            return typeof SharedArrayBuffer !== 'undefined' ? 1 : 0;
        });

        // Detect Web Crypto API (5-15x speedup for crypto operations)
        g_caps.has_web_crypto = EM_ASM_INT({
            return typeof crypto !== 'undefined' &&
                   typeof crypto.subtle !== 'undefined' ? 1 : 0;
        });

        // Detect OPFS (Origin Private File System, 3-4x speedup vs IDBFS)
        g_caps.has_opfs = EM_ASM_INT({
            return typeof navigator !== 'undefined' &&
                   typeof navigator.storage !== 'undefined' &&
                   typeof navigator.storage.getDirectory !== 'undefined' ? 1 : 0;
        });

        // Detect Web Workers support
        g_caps.has_workers = EM_ASM_INT({
            return typeof Worker !== 'undefined' ? 1 : 0;
        });

        // Detect Chrome version (target: 113+)
        g_caps.chrome_version = EM_ASM_INT({
            if (typeof navigator === 'undefined') return 0;
            const match = navigator.userAgent.match(/Chrome\/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });

        g_initialized = true;
    }
    return &g_caps;
}

EMSCRIPTEN_KEEPALIVE
bool web_has_minimum_requirements(void) {
    const WebCapabilities* caps = web_get_capabilities();
    // Require Chrome 113+ with SIMD support
    return caps->has_wasm_simd && caps->chrome_version >= 113;
}
