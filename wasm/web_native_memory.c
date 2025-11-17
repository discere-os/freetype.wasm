/*
 * Web-Native Memory Management
 * Integration with browser GC and WeakRef for better memory management
 */

#include <emscripten.h>
#include <stdlib.h>

// Register pointer with WeakRef for automatic GC integration
EM_JS(void, register_weak_ref_js, (void* ptr, const char* label), {
    if (typeof WeakRef === 'undefined') {
        return; // WeakRef not available in older browsers
    }

    const labelStr = UTF8ToString(label);

    // Create WeakRef to track object lifetime
    const ref = new WeakRef({
        ptr: ptr,
        label: labelStr,
        timestamp: Date.now()
    });

    // Store in global registry (simplified)
    if (!Module.weakRefs) {
        Module.weakRefs = [];
    }
    Module.weakRefs.push(ref);
});

EMSCRIPTEN_KEEPALIVE
void web_register_weak_ref(void* ptr, const char* label) {
    register_weak_ref_js(ptr, label);
}

// Request memory pressure hint to browser
EM_JS(void, web_memory_pressure_hint, (int level), {
    // level: 0 = normal, 1 = moderate, 2 = critical
    if (typeof performance !== 'undefined' && performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        const pressure = used / limit;

        if (level >= 2 || pressure > 0.9) {
            console.warn('Critical memory pressure:', {
                used: (used / 1024 / 1024).toFixed(2) + ' MB',
                limit: (limit / 1024 / 1024).toFixed(2) + ' MB',
                pressure: (pressure * 100).toFixed(1) + '%'
            });
        }
    }
});

EMSCRIPTEN_KEEPALIVE
void web_hint_memory_pressure(int level) {
    web_memory_pressure_hint(level);
}

// Get memory stats
EMSCRIPTEN_KEEPALIVE
size_t web_get_heap_size(void) {
    return EM_ASM_INT({
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    });
}

EMSCRIPTEN_KEEPALIVE
size_t web_get_heap_limit(void) {
    return EM_ASM_INT({
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.jsHeapSizeLimit;
        }
        return 0;
    });
}

// Trigger GC hint (browser may ignore)
EM_JS(void, web_gc_hint, (), {
    if (typeof gc !== 'undefined') {
        // gc() is available in some browsers with --expose-gc flag
        try {
            gc();
        } catch(e) {
            // Silently ignore
        }
    }
});

EMSCRIPTEN_KEEPALIVE
void web_request_gc(void) {
    web_gc_hint();
}
