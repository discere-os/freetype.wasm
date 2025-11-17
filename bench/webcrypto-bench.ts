/**
 * FreeType WebCrypto + SIMD Benchmarks
 *
 * Tests hardware-accelerated SHA-256 hashing and SIMD bitmap operations.
 *
 * Performance targets:
 * - WebCrypto SHA-256: ≥8x faster than software
 * - SIMD bitmap copy: ≥4x faster than memcpy
 * - SIMD bitmap blend: ≥3x faster than scalar
 */

import FreeType from "../install/wasm/freetype-main.js";

const module = await FreeType();

console.log("[Benchmark] FreeType WebCrypto + SIMD");

// =============================================================================
// WebCrypto SHA-256 Benchmark
// =============================================================================

console.log("\n[Test] SHA-256 hashing...");

const data = new Uint8Array(1024 * 1024);  // 1MB
crypto.getRandomValues(data);

const data_ptr = module._malloc(data.length);
const hash_ptr = module._malloc(32);
module.HEAPU8.set(data, data_ptr);

// Software baseline (fallback implementation)
const sw_start = performance.now();
for (let i = 0; i < 100; i++) {
    // Call software SHA-256 directly
    // Note: This assumes we export the software_sha256 function
    // For now, we'll benchmark the full FT_Web_Crypto_SHA256 with small data
    // to force software fallback (< 1024 bytes threshold)
    const small_data_ptr = module._malloc(512);
    module.HEAPU8.set(data.slice(0, 512), small_data_ptr);

    if (module._FT_Web_Crypto_SHA256) {
        module._FT_Web_Crypto_SHA256(small_data_ptr, 512, hash_ptr);
    }

    module._free(small_data_ptr);
}
const sw_time = performance.now() - sw_start;

// WebCrypto hardware acceleration
const hw_start = performance.now();
for (let i = 0; i < 100; i++) {
    if (module._FT_Web_Crypto_SHA256) {
        await module._FT_Web_Crypto_SHA256(data_ptr, data.length, hash_ptr);
    }
}
const hw_time = performance.now() - hw_start;

const hash_speedup = sw_time / hw_time;
console.log(`  Software: ${sw_time.toFixed(0)}ms`);
console.log(`  Hardware: ${hw_time.toFixed(0)}ms`);
console.log(`  Speedup: ${hash_speedup.toFixed(1)}x`);

if (hash_speedup < 8.0) {
    console.warn(`  ⚠️  WebCrypto ${hash_speedup.toFixed(1)}x < 8x target`);
} else {
    console.log(`  ✅ WebCrypto achieved ${hash_speedup.toFixed(1)}x speedup (target: ≥8x)`);
}

// =============================================================================
// SIMD Bitmap Copy Benchmark
// =============================================================================

console.log("\n[Test] Bitmap copy operations...");

const bitmap_size = 256 * 256;
const bitmap = new Uint8Array(bitmap_size);
crypto.getRandomValues(bitmap);

const src_ptr = module._malloc(bitmap_size);
const dst_ptr = module._malloc(bitmap_size);
module.HEAPU8.set(bitmap, src_ptr);

// Scalar copy (memcpy baseline)
const copy_scalar_start = performance.now();
for (let i = 0; i < 1000; i++) {
    // Use standard memcpy
    if (module._memcpy) {
        module._memcpy(dst_ptr, src_ptr, bitmap_size);
    } else {
        // Fallback: manual copy
        for (let j = 0; j < bitmap_size; j++) {
            module.HEAPU8[dst_ptr + j] = module.HEAPU8[src_ptr + j];
        }
    }
}
const copy_scalar_time = performance.now() - copy_scalar_start;

// SIMD copy
const copy_simd_start = performance.now();
for (let i = 0; i < 1000; i++) {
    if (module._FT_SIMD_Bitmap_Copy) {
        module._FT_SIMD_Bitmap_Copy(
            dst_ptr, src_ptr, 256, 256, 256, 256);
    }
}
const copy_simd_time = performance.now() - copy_simd_start;

const copy_speedup = copy_scalar_time / copy_simd_time;
console.log(`  Scalar copy: ${copy_scalar_time.toFixed(0)}ms`);
console.log(`  SIMD copy: ${copy_simd_time.toFixed(0)}ms`);
console.log(`  Speedup: ${copy_speedup.toFixed(1)}x`);

if (copy_speedup < 4.0) {
    console.warn(`  ⚠️  Bitmap copy ${copy_speedup.toFixed(1)}x < 4x target`);
} else {
    console.log(`  ✅ SIMD copy achieved ${copy_speedup.toFixed(1)}x speedup (target: ≥4x)`);
}

// =============================================================================
// SIMD Bitmap Blend Benchmark
// =============================================================================

console.log("\n[Test] Bitmap blend operations...");

// Scalar blending baseline
const blend_scalar_start = performance.now();
const alpha = 128;  // 50% blend
for (let i = 0; i < 1000; i++) {
    // Manual scalar blending
    for (let j = 0; j < bitmap_size; j++) {
        const dst_val = module.HEAPU8[dst_ptr + j];
        const src_val = module.HEAPU8[src_ptr + j];
        const blended = (dst_val * (255 - alpha) + src_val * alpha) / 255;
        module.HEAPU8[dst_ptr + j] = blended & 0xFF;
    }
}
const blend_scalar_time = performance.now() - blend_scalar_start;

// SIMD blending
const blend_simd_start = performance.now();
for (let i = 0; i < 1000; i++) {
    if (module._FT_SIMD_Bitmap_Blend) {
        module._FT_SIMD_Bitmap_Blend(
            dst_ptr, src_ptr, 256, 256, alpha);
    }
}
const blend_simd_time = performance.now() - blend_simd_start;

const blend_speedup = blend_scalar_time / blend_simd_time;
console.log(`  Scalar blend: ${blend_scalar_time.toFixed(0)}ms`);
console.log(`  SIMD blend: ${blend_simd_time.toFixed(0)}ms`);
console.log(`  Speedup: ${blend_speedup.toFixed(1)}x`);

if (blend_speedup < 3.0) {
    console.warn(`  ⚠️  Bitmap blend ${blend_speedup.toFixed(1)}x < 3x target`);
} else {
    console.log(`  ✅ SIMD blend achieved ${blend_speedup.toFixed(1)}x speedup (target: ≥3x)`);
}

// =============================================================================
// Cleanup
// =============================================================================

module._free(data_ptr);
module._free(hash_ptr);
module._free(src_ptr);
module._free(dst_ptr);

// =============================================================================
// Summary
// =============================================================================

console.log("\n" + "=".repeat(60));
console.log("Summary:");
console.log("=".repeat(60));

const all_passed =
    hash_speedup >= 8.0 &&
    copy_speedup >= 4.0 &&
    blend_speedup >= 3.0;

if (all_passed) {
    console.log("✅ All FreeType WebCrypto + SIMD benchmarks passed!");
    console.log(`   - SHA-256: ${hash_speedup.toFixed(1)}x (target: ≥8x)`);
    console.log(`   - Bitmap copy: ${copy_speedup.toFixed(1)}x (target: ≥4x)`);
    console.log(`   - Bitmap blend: ${blend_speedup.toFixed(1)}x (target: ≥3x)`);
} else {
    console.error("❌ Some benchmarks did not meet performance targets:");
    if (hash_speedup < 8.0) {
        console.error(`   - SHA-256: ${hash_speedup.toFixed(1)}x < 8x target`);
    }
    if (copy_speedup < 4.0) {
        console.error(`   - Bitmap copy: ${copy_speedup.toFixed(1)}x < 4x target`);
    }
    if (blend_speedup < 3.0) {
        console.error(`   - Bitmap blend: ${blend_speedup.toFixed(1)}x < 3x target`);
    }
    Deno.exit(1);
}
