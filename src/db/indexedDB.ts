// файл с функциями для работы с БД
import type { ItemData } from '../types';

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
function _countRecords(dataBase: IDBDatabase, storeName: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const tx = dataBase.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// заполняем хранилища данными из json
async function _setData(url: string, dataBase: IDBDatabase, storeName: string): Promise<void> {
  const response = await fetch(url);
  const rawData = (await response.json()) as Array<{ t: string; v: number }>;
  const records: ItemData[] = rawData.map((item) => ({
    date: item.t,
    value: item.v,
  }));
  return new Promise<void>((resolve, reject) => {
    const trans = dataBase.transaction(storeName, 'readwrite');
    const store = trans.objectStore(storeName);
    records.forEach((rec) => store.put(rec));
    trans.oncomplete = () => resolve();
    trans.onerror = () => reject(trans.error);
  });
}

// публичная функция инициализации БД
export async function initDataBase(): Promise<IDBDatabase> {
  const dataBase = await _openDataBase();
  if ((await _countRecords(dataBase, 'temperature')) === 0) {
    await _setData('../data/temperature.json', dataBase, 'temperature');
  }
  if ((await _countRecords(dataBase, 'precipitation')) === 0) {
    await _setData('../data/precipitation.json', dataBase, 'precipitation');
  }
  return dataBase;
}

// читает все данные из таблицы
export function getAllData(dataBase: IDBDatabase, storeName: string): Promise<ItemData[]> {
  return new Promise<ItemData[]>((resolve, reject) => {
    const trans = dataBase.transaction(storeName, 'readonly');
    const store = trans.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ItemData[]);
    request.onerror = () => reject(request.error);
  });
}