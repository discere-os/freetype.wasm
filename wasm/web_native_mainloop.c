/*
 * Web-Native Main Loop
 * RequestAnimationFrame integration for UI libraries
 */

#include <emscripten.h>
#include <stdbool.h>

typedef void (*frame_callback_t)(double time, void* user_data);

static frame_callback_t g_frame_callback = NULL;
static void* g_frame_user_data = NULL;
static bool g_loop_running = false;

// RAF loop callback from JavaScript
static void raf_frame_handler(void) {
    if (g_frame_callback && g_loop_running) {
        double time = EM_ASM_DOUBLE({
            return performance.now();
        });
        g_frame_callback(time, g_frame_user_data);
    }
}

// Setup requestAnimationFrame loop (for UI rendering)
EM_JS(void, setup_raf_loop_js, (void (*callback)(void)), {
    Module.rafLoopActive = true;

    function loop() {
        if (Module.rafLoopActive) {
            dynCall('v', callback, []);
            requestAnimationFrame(loop);
        }
    }

    requestAnimationFrame(loop);
});

EMSCRIPTEN_KEEPALIVE
void web_start_raf_loop(frame_callback_t callback, void* user_data) {
    g_frame_callback = callback;
    g_frame_user_data = user_data;
    g_loop_running = true;

    setup_raf_loop_js(raf_frame_handler);
}

EMSCRIPTEN_KEEPALIVE
void web_stop_raf_loop(void) {
    g_loop_running = false;
    EM_ASM({
        Module.rafLoopActive = false;
    });
}

// High-precision timing
EMSCRIPTEN_KEEPALIVE
double web_get_performance_now(void) {
    return EM_ASM_DOUBLE({
        return performance.now();
    });
}

// Idle callback (browser executes when idle)
EM_JS(void, request_idle_callback_js, (void (*callback)(void)), {
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
            dynCall('v', callback, []);
        });
    } else {
        // Fallback to setTimeout
        setTimeout(() => {
            dynCall('v', callback, []);
        }, 16); // ~60fps
    }
});

EMSCRIPTEN_KEEPALIVE
void web_request_idle_callback(void (*callback)(void)) {
    request_idle_callback_js(callback);
}

// For font rendering, schedule glyph rasterization during idle time
EMSCRIPTEN_KEEPALIVE
void web_schedule_idle_work(void (*work_callback)(void)) {
    request_idle_callback_js(work_callback);
}
