# WASM builds for FreeType with web-native optimizations
# Dual architecture: SIDE_MODULE (production) + MAIN_MODULE (testing/NPM)

# Conditional compilation flags based on build type
wasm_common_flags = [
  '-fPIC',
  '-sWASM_BIGINT=1',
  '-DFT_WASM=1',
]

# SIMD flags (3-5x speedup for string operations)
wasm_simd_flags = get_option('wasm_simd') ? ['-msimd128'] : []

# Threading flags (10x speedup vs pthread emulation)
wasm_threading_flags = get_option('wasm_threading') ? [
  '-pthread',
  '-sPTHREAD_POOL_SIZE=4',
  '-sSHARED_MEMORY=1',
] : []

# Build type specific flags
if get_option('wasm_build_type') == 'minimal'
  wasm_flags = wasm_common_flags + [
    '-sINITIAL_MEMORY=67108864',  # 64MB
    '-sSTACK_SIZE=2097152',       # 2MB
  ]
  wasm_opt_level = '-Oz'  # Optimize for size
elif get_option('wasm_build_type') == 'webgpu'
  wasm_flags = wasm_common_flags + wasm_simd_flags + wasm_threading_flags + [
    '-sINITIAL_MEMORY=134217728',  # 128MB
    '-sMAXIMUM_MEMORY=1073741824', # 1GB
    '-sALLOW_MEMORY_GROWTH=1',
    '-sUSE_WEBGPU=1',
    '-sASYNCIFY=1',
  ]
  wasm_opt_level = '-O3'
else  # standard
  wasm_flags = wasm_common_flags + wasm_simd_flags + wasm_threading_flags + [
    '-sINITIAL_MEMORY=134217728',  # 128MB
    '-sMAXIMUM_MEMORY=1073741824', # 1GB
    '-sALLOW_MEMORY_GROWTH=1',
  ]
  wasm_opt_level = '-O3'
endif

# Optimization strategy
if get_option('wasm_optimize') == 'size'
  wasm_opt_flags = ['-Oz', '-flto']
elif get_option('wasm_optimize') == 'speed'
  wasm_opt_flags = ['-O3', '-flto', '-ffast-math']
else  # balanced
  wasm_opt_flags = ['-O3', '-flto']
endif

# Combine all compile flags
ft_wasm_cargs = wasm_flags + wasm_simd_flags + [wasm_opt_level]

# Web-native source files
web_native_sources = files(
  'web_native_capabilities.c',
  'web_native_simd_strings.c',
  'web_native_crypto.c',
  'web_native_threading.c',
  'web_native_networking.c',
  'web_native_filesystem.c',
  'web_native_memory.c',
  'web_native_mainloop.c',
)

# MAIN_MODULE target (testing, NPM distribution)
ft_main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=FreeTypeModule',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString","FS","HEAPU8"]',
  '-sEXPORTED_FUNCTIONS=["_malloc","_free","_freetype_wasm_version","_web_get_capabilities","_web_simd_strlen","_web_simd_memcmp"]',
] + wasm_flags + wasm_opt_flags

executable(
  'freetype-main',
  files('freetype_wasm_module.c') + web_native_sources,
  dependencies: [freetype_dep],
  c_args: ft_wasm_cargs,
  link_args: ft_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)

# SIDE_MODULE target (production, dynamic loading)
ft_side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC',
  '-sERROR_ON_UNDEFINED_SYMBOLS=0',  # Host provides dependencies
  '-sEXPORTED_FUNCTIONS=["_freetype_wasm_version","_web_get_capabilities","_web_simd_strlen","_web_simd_memcmp"]',
] + wasm_opt_flags

shared_module(
  'freetype-side',
  files('freetype_wasm_side.c') + web_native_sources,
  dependencies: [freetype_dep],
  name_prefix: '',
  name_suffix: 'wasm',
  c_args: ft_wasm_cargs,
  link_args: ft_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

# Create symbolic link for ft2build.h at top level for harfbuzz compatibility
install_symlink(
  'ft2build.h',
  pointing_to: 'freetype2/ft2build.h',
  install_dir: get_option('includedir'),
)
