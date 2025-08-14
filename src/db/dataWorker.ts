// воркер для загрузки и записи данных в IndexedDB

type ItemData = {
  date: string;
  value: number;
};

type InitMessage = {
  action: 'setData';
  url: string;
  dbName: string;
  version: number;
  storeName: string;
  chunkSize?: number;
};

function openDatabase(dbName: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
      // хранилища уже созданы в главном потоке
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function fetchRecords(url: string): Promise<ItemData[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Ошибка загрузки ${url}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Неверный формат данных ${url}`);

  return data.map(i => ({ date: i.t, value: i.v }));
}

function writeChunk(db: IDBDatabase, store: string, chunk: ItemData[]) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    chunk.forEach(item => s.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function setData({ url, dbName, version, storeName, chunkSize = 1000 }: InitMessage) {
  const db = await openDatabase(dbName, version);
  const records = await fetchRecords(url);

  for (let i = 0; i < records.length; i += chunkSize) {
    await writeChunk(db, storeName, records.slice(i, i + chunkSize));
    self.postMessage({
      type: 'progress',
      written: Math.min(i + chunkSize, records.length),
      total: records.length
    });
    await new Promise(r => setTimeout(r));
  }
}

self.onmessage = async e => {
  const msg = e.data;
  if (msg?.action !== 'setData') return;

  try {
    await setData(msg);
    self.postMessage({ type: 'done' });
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message || String(err) });
  }
};


