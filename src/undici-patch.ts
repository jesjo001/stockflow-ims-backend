'use strict';

// Disable WebAssembly for undici - forces HTTP/1.1 to use JavaScript parser
// This is required in constrained environments where WebAssembly is problematic

// Store original for reference
const OriginalWebAssembly = globalThis.WebAssembly;

// Delete llhttp cache if it exists (prevents wasm from being loaded)
if (require.cache) {
  const keys = Object.keys(require.cache);
  keys.forEach(key => {
    if (key.includes('llhttp')) {
      delete require.cache[key];
    }
  });
}

// Set WebAssembly to undefined at module load time
// This prevents undici from attempting to load llhttp.wasm
globalThis.WebAssembly = undefined as any;

console.log('[undici-patch] WebAssembly set to undefined - undici will use HTTP/1.1 JavaScript parser');