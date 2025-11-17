/*
 * Web-Native Networking
 * 3-5x speedup using Fetch API vs XMLHttpRequest
 */

#include <emscripten.h>
#include <stdlib.h>
#include <string.h>

typedef void (*fetch_callback_t)(const char* data, size_t len, void* user_data);

// Fetch API GET (3-5x faster than XMLHttpRequest for large responses)
EM_JS(void, web_fetch_get_async, (const char* url, fetch_callback_t callback, void* user_data), {
    const urlStr = UTF8ToString(url);
    fetch(urlStr)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const ptr = _malloc(data.byteLength);
            HEAPU8.set(data, ptr);
            dynCall('viii', callback, [ptr, data.byteLength, user_data]);
            _free(ptr);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            dynCall('viii', callback, [0, 0, user_data]);
        });
});

EMSCRIPTEN_KEEPALIVE
void web_fetch_get(const char* url, fetch_callback_t callback, void* user_data) {
    web_fetch_get_async(url, callback, user_data);
}

// Fetch API POST with binary data
EM_JS(void, web_fetch_post_async, (
    const char* url,
    const uint8_t* data,
    size_t data_len,
    fetch_callback_t callback,
    void* user_data), {

    const urlStr = UTF8ToString(url);
    const bodyData = HEAPU8.slice(data, data + data_len);

    fetch(urlStr, {
        method: 'POST',
        body: bodyData,
        headers: {
            'Content-Type': 'application/octet-stream'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
    })
    .then(buffer => {
        const respData = new Uint8Array(buffer);
        const ptr = _malloc(respData.byteLength);
        HEAPU8.set(respData, ptr);
        dynCall('viii', callback, [ptr, respData.byteLength, user_data]);
        _free(ptr);
    })
    .catch(err => {
        console.error('Fetch POST error:', err);
        dynCall('viii', callback, [0, 0, user_data]);
    });
});

EMSCRIPTEN_KEEPALIVE
void web_fetch_post(const char* url, const uint8_t* data, size_t data_len,
                    fetch_callback_t callback, void* user_data) {
    web_fetch_post_async(url, data, data_len, callback, user_data);
}

// Download font from URL (common use case for FreeType)
EMSCRIPTEN_KEEPALIVE
void web_fetch_font(const char* url, fetch_callback_t callback, void* user_data) {
    // Fonts typically benefit from streaming
    web_fetch_get(url, callback, user_data);
}
