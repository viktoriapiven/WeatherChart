// файл с функциями для работы с БД

// открываем новую БД с 2 "таблицами"
function _openDataBase() {
  return new Promise((resolve, reject) => {
    const dBOpenRequest = indexedDB.open('WeatherdataBase', 1);
    // создаём хранилища для данных из json c температурой и осадками 
    dBOpenRequest.onupgradeneeded = event => {
      const dataBase = event.target.result;
      if (!dataBase.objectStoreNames.contains('temperature')) {
        dataBase.createObjectStore('temperature', { keyPath: 'date' });
      }
      if (!dataBase.objectStoreNames.contains('precipitation')) {
        dataBase.createObjectStore('precipitation', { keyPath: 'date' });
      }
    };
    dBOpenRequest.onsuccess = event => {
      resolve(event.target.result);
    };
    dBOpenRequest.onerror = event => {
      reject(event.target.error);
    };
  });
}

// возвращает количество записей в хранилище
function _countRecords(dataBase, storeName) {
  return new Promise((resolve, reject) => {
    const tx = dataBase.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

// заполняем хранилища данными из json
async function _setData(url, dataBase, storeName) {
  const data = await fetch(url);
  const rawData = await data.json();
  const records = rawData.map(item => ({
    date: item.t,
    value: item.v
  }));
  return new Promise((resolve, reject) => {
    const trans = dataBase.transaction(storeName, 'readwrite');
    const store = trans.objectStore(storeName);
    records.forEach(rec => store.put(rec));
    trans.oncomplete = () => resolve();
    trans.onerror = () => reject();
  });
}

// публичная функция инициализации БД
export async function initDataBase() {
  const dataBase = await _openDataBase();
  if ((await _countRecords(dataBase, 'temperature')) === 0) {
    await _setData('../data/temperature.json', dataBase, 'temperature');
  }
  if ((await _countRecords(dataBase, 'precipitation')) === 0) {
    await _setData('../data/precipitation.json', dataBase, 'precipitation');
  }
  return dataBase;
}

//читает все данные из таблицы
export function getAllData(dataBase, storeName) {
  return new Promise((resolve, reject) => {
    const trans = dataBase.transaction(storeName, 'readonly');
    const store = trans.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}