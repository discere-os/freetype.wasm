/**
 * Freetype WASM Benchmarks
 */

import FreetypeWASM from "../src/lib/index.ts"

Deno.bench("freetype initialization", {
  baseline: true
}, async () => {
  const lib = new FreetypeWASM()
  await lib.initialize()
})
