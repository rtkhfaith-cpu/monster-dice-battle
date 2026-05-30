/** Minimal stand-ins for react-native + AsyncStorage used by game-logic modules in tests. */
const mem = new Map();

const AsyncStorage = {
  async getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  async setItem(k, v) { mem.set(k, String(v)); },
  async removeItem(k) { mem.delete(k); },
  async clear() { mem.clear(); },
};

export default AsyncStorage;
export const Platform = { OS: 'web', select: (o) => (o ? (o.web ?? o.default) : undefined) };
