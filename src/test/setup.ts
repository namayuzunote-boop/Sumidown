// Vitest global setup.
//
// jsdom (as wired by vitest) ships an inert localStorage, but fileService's
// browser fallback uses it as real storage. Install a minimal Map-backed
// Storage so those code paths can be exercised faithfully.
if (typeof globalThis.localStorage?.setItem !== "function") {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}
