/*
 * Оқушы жұмысын сақтау: IndexedDB (негізгі), қолжетімсіз болса — localStorage.
 * Әр тапсырманың жазбасы:
 *  { id, topic, objective, level, lines:[{t:'m'|'t', v}], answers:{}, board:{items:[]}, mode,
 *    checked, result:[...], self:{}, chat:[...], updatedAt }
 */
window.PL = window.PL || {};
PL.store = (function () {
  const DB = 'physics-lab-7', STORE = 'work', VER = 1;
  const cache = new Map();
  let db = null, useLS = false;

  function openDB() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) { useLS = true; return resolve(); }
      let req;
      try { req = indexedDB.open(DB, VER); } catch (e) { useLS = true; return resolve(); }
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = () => { db = req.result; resolve(); };
      req.onerror = () => { useLS = true; resolve(); };
      req.onblocked = () => { useLS = true; resolve(); };
      // IndexedDB жауап бермесе (мыс., басқа бетте бұғатталған) — сайт қатып қалмауы үшін localStorage-ке көшеміз
      setTimeout(() => { if (!db) { useLS = true; resolve(); } }, 2500);
    });
  }

  async function init() {
    await openDB();
    if (useLS) {
      try {
        const raw = localStorage.getItem('pl-work');
        if (raw) JSON.parse(raw).forEach(r => cache.set(r.id, r));
      } catch (e) {}
      return;
    }
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => { (req.result || []).forEach(r => cache.set(r.id, r)); resolve(); };
        req.onerror = () => resolve();
      } catch (e) { useLS = true; resolve(); }
    });
  }

  function persist(rec) {
    if (useLS) {
      try { localStorage.setItem('pl-work', JSON.stringify([...cache.values()])); return Promise.resolve(true); }
      catch (e) { return Promise.resolve(false); }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }

  const timers = {};
  return {
    init,
    backend: () => (useLS ? 'localStorage' : 'IndexedDB'),
    get: (id) => cache.get(id),
    all: () => [...cache.values()],
    /* Жазбаны жаңарту; delay > 0 болса — кейінге қалдырып сақтау (автосақтау) */
    put(rec, delay) {
      rec.updatedAt = Date.now();
      cache.set(rec.id, rec);
      clearTimeout(timers[rec.id]);
      if (delay) {
        return new Promise(res => { timers[rec.id] = setTimeout(() => persist(rec).then(res), delay); });
      }
      return persist(rec);
    },
    remove(id) {
      cache.delete(id);
      clearTimeout(timers[id]);
      if (useLS) { try { localStorage.setItem('pl-work', JSON.stringify([...cache.values()])); } catch (e) {} return Promise.resolve(); }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (e) { resolve(); }
      });
    }
  };
})();
