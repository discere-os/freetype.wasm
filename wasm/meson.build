ft_wasm_cargs = ['-msimd128', '-DFT_WASM=1']

ft_main_link_args = [
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sEXPORT_NAME=FreeTypeModule',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sENVIRONMENT=web,webview,worker',
  '-sNO_FILESYSTEM=1',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
  '-O3',
  '-flto',
]

executable(
  'freetype-main',
  files('freetype_wasm_module.c'),
  dependencies: [freetype_dep],
  c_args: ft_wasm_cargs,
  link_args: ft_main_link_args,
  install: true,
  install_dir: get_option('bindir'),
)

ft_side_link_args = [
  '-sSIDE_MODULE=2',
  '-fPIC',
  '-O3',
  '-flto',
  '-sEXPORTED_FUNCTIONS=["_freetype_wasm_version"]',
]

shared_module(
  'freetype-side',
  files('freetype_wasm_side.c'),
  dependencies: [freetype_dep],
  name_prefix: '',
  c_args: ft_wasm_cargs,
  link_args: ft_side_link_args,
  install: true,
  install_dir: get_option('libdir'),
)

