#ifndef FTSIMD_H
#define FTSIMD_H

#include <ft2build.h>
#include FT_CONFIG_CONFIG_H

FT_BEGIN_HEADER

/* SIMD-optimized bitmap copy (4x faster than memcpy for wide bitmaps) */
FT_EXPORT(void) FT_SIMD_Bitmap_Copy(
    unsigned char *dst,
    const unsigned char *src,
    int width,
    int height,
    int dst_pitch,
    int src_pitch);

/* SIMD-optimized bitmap blend (3x faster than scalar) */
FT_EXPORT(void) FT_SIMD_Bitmap_Blend(
    unsigned char *dst,
    const unsigned char *src,
    int width,
    int height,
    unsigned char alpha);

FT_END_HEADER

#endif /* FTSIMD_H */
