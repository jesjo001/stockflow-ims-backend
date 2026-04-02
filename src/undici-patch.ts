'use strict';

// Must run before ANY module loads — called via --require flag
// Undici needs WebAssembly to load llhttp.wasm; setting it to undefined
// forces undici to throw internally and use its JS fallback path

Object.defineProperty(globalThis, 'WebAssembly', {
  get: () => undefined,
  set: () => {},
  configurable: true,
});

console.log('[undici-patch] WebAssembly disabled globally');