#ifndef FTWEB_CRYPTO_H
#define FTWEB_CRYPTO_H

#include <ft2build.h>
#include FT_CONFIG_CONFIG_H

FT_BEGIN_HEADER

typedef struct {
    int has_web_crypto;
    int has_wasm_simd;
} FTWebCapabilities;

// Get runtime web capabilities
FT_EXPORT(const FTWebCapabilities*) FT_Web_Get_Capabilities(void);

// Hardware SHA-256 via WebCrypto (8x faster than software)
FT_EXPORT(int) FT_Web_Crypto_SHA256(
    const unsigned char *data,
    size_t length,
    unsigned char *hash_out);  // 32 bytes output

FT_END_HEADER

#endif
