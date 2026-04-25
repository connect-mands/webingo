const store = new Map();

export function cacheGet(key) {
  const item = store.get(key);
  if (!item || item.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return item.value;
}

export function cacheSet(key, value, ttlMs = 30000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDeleteByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
