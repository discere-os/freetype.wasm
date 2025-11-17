/*
 * Web-Native Capabilities Detection - Header
 */

#ifndef WEB_NATIVE_CAPABILITIES_H
#define WEB_NATIVE_CAPABILITIES_H

#include <stdbool.h>

typedef struct {
    bool has_wasm_simd;
    bool has_webgpu;
    bool has_shared_array_buffer;
    bool has_web_crypto;
    bool has_opfs;
    bool has_workers;
    int chrome_version;
} WebCapabilities;

const WebCapabilities* web_get_capabilities(void);
bool web_has_minimum_requirements(void);

#endif /* WEB_NATIVE_CAPABILITIES_H */
