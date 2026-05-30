/**
 * Node module-resolution hook: stubs react-native + AsyncStorage and resolves
 * extensionless relative imports (./foo -> ./foo.js or ./foo/index.js) so the
 * game-logic modules can run under plain node in test scripts.
 */
const STUBS = new Set([
  'react-native',
  '@react-native-async-storage/async-storage',
]);

const STUB_URL = new URL('./rn-stub-impl.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (STUBS.has(specifier)) {
    return { url: STUB_URL, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[mc]?js$/.test(specifier)) {
      for (const ext of ['.js', '/index.js', '.mjs']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch { /* try next */ }
      }
    }
    throw err;
  }
}
