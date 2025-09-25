#include <stdio.h>
#include <ft2build.h>
#include FT_FREETYPE_H

const char* freetype_wasm_version(void) {
  static char buf[32];
  snprintf(buf, sizeof(buf), "%d.%d.%d", FREETYPE_MAJOR, FREETYPE_MINOR, FREETYPE_PATCH);
  return buf;
}

