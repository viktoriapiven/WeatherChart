// файл с функциями для работы с БД
import type { ItemData } from '../types';

const CHUNK_SIZE = 1000;

// открываем новую БД с 2 "таблицами"
function _openDataBase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const dBOpenRequest = indexedDB.open('WeatherdataBase', 1);
    // создаём хранилища для данных из json c температурой и осадками
    dBOpenRequest.onupgradeneeded = () => {
      const dataBase = dBOpenRequest.result;
      if (!dataBase.objectStoreNames.contains('temperature')) {
        dataBase.createObjectStore('temperature', { keyPath: 'date' });
      }
      if (!dataBase.objectStoreNames.contains('precipitation')) {
        dataBase.createObjectStore('precipitation', { keyPath: 'date' });
      }
    };
    dBOpenRequest.onsuccess = () => {
      resolve(dBOpenRequest.result);
    };
    dBOpenRequest.onerror = () => {
      reject(dBOpenRequest.error);
    };
  });
}

// возвращает количество записей в хранилище
export function countRecords(dataBase: IDBDatabase, storeName: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const tx = dataBase.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

 // выполняем запись в отдельном потоке, чтобы не блокировать UI
 async function _setData(url: string, dataBase: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./dataWorker.ts', import.meta.url), { type: 'module' });
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; message?: string };
      if (!msg?.type) return;
      if (msg.type === 'done') {
        cleanup();
        resolve();
      } else if (msg.type === 'error') {
        cleanup();
        reject(new Error(msg.message || 'Worker error'));
      }
    };
    const onError = (err: ErrorEvent) => {
      cleanup();
      reject(err.error || new Error(err.message));
    };
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.terminate();
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({
      action: 'setData',
      url,
      dbName: dataBase.name,
      version: dataBase.version,
      storeName,
      chunkSize: CHUNK_SIZE,
    });
  });
}

// публичная функция инициализации БД
export async function initDataBase(): Promise<IDBDatabase> {
  const dataBase = await _openDataBase();
  if ((await countRecords(dataBase, 'temperature')) === 0) {
    // выполняем запись в отдельном потоке, чтобы не блокировать UI
    await _setData('/data/temperature.json', dataBase, 'temperature');
  }
  return dataBase;
}

// читает все данные из таблицы
export function getAllData(dataBase: IDBDatabase, storeName: string): Promise<ItemData[]> {
  return new Promise<ItemData[]>((resolve, reject) => {
    const trans = dataBase.transaction(storeName, 'readonly');
    const store = trans.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result as ItemData[])
    };
    request.onerror = () => reject(request.error);
  });
}

// публичный метод заполнения данными из json
export async function setDataFromServer(url: string, dataBase: IDBDatabase, storeName: string): Promise<void> {
  return _setData(url, dataBase, storeName);
}