import { useState, useEffect, useMemo } from 'react';
import { initDataBase, getAllData, setDataFromServer, countRecords } from '../db/indexedDB';
import YearSelector from './YearSelector';
import Graph from './Graph';
import { ItemData } from '../types';


// по ТЗ "последние 120 лет", но в json файлах и макете данные с 1881 по 2006,
//  т е 125 лет, оставим их чтобы график был красивый и не было провала после 2006
const START_DATE = '12.31.2006';
const YEARS_COUNT = 125;

function WeatherView() {
    const [dataBase, setDataBase] = useState<IDBDatabase | null>(null);
    const currentYear = new Date(START_DATE).getFullYear();
    const [yearStart, setYearStart] = useState(currentYear - YEARS_COUNT);
    const [yearEnd, setYearEnd] = useState(currentYear);
    const [temperatureData, setTemperatureData] = useState<ItemData[]>([]);
    const [precipitationData, setPrecipitationData] = useState<ItemData[]>([]);
    const [selectedType, setSelectedType] = useState('temperature');

    useEffect(() => {
        initDataBase().then(setDataBase).catch(console.error);
    }, []);

    useEffect(() => {
        if (!dataBase) return;
        async function loadData() {
            const temp = await getAllData(dataBase!, 'temperature');
            setTemperatureData(temp);
        }
        loadData();
    }, [dataBase]);

    // подгрузка данных по требованию, по замечанию по реализации
    async function loadPrecipitationData() {
        if (!dataBase) return;
        const count = await countRecords(dataBase, 'precipitation');
        if (count === 0) {
            await setDataFromServer('/data/precipitation.json', dataBase, 'precipitation');
            const newData = await getAllData(dataBase, 'precipitation');
            setPrecipitationData(newData);
        } else {
            const existingData = await getAllData(dataBase, 'precipitation');
            setPrecipitationData(existingData);
        }
    }

    function handleClickTemperature() {
        setSelectedType('temperature');
    }

    // данные для осадков грузим только при первом переходе к графику Осадки
    function handleClickPrecipitation() {
        setSelectedType('precipitation');
        loadPrecipitationData();
    }

    const allData = selectedType === 'temperature' ? temperatureData : precipitationData;
    // фильтрует данные из таблиц по дате
    const filteredData = useMemo((): ItemData[] => {
        return allData.filter((data: ItemData) => {
            const year = new Date(data.date).getFullYear();
            return year >= yearStart && year <= yearEnd;
        });
    }, [allData, yearStart, yearEnd]);

    return (
        <div className='body'>
            <div className='title'>Архив метеослужбы</div>
            <div className='content'>
                <div className='content-left'>
                    <div>
                        <button
                            id='temperatureButton'
                            className='button'
                            onClick={() => handleClickTemperature()}>
                            Температура
                        </button>
                    </div>
                    <div>
                        <button
                            id='precipitationButton'
                            className='button button-precipitation'
                            onClick={() => handleClickPrecipitation()}>
                            Осадки
                        </button>
                    </div>
                </div>
                <div className='content-right'>
                    <div>
                        <YearSelector
                            selectedYear={yearStart}
                            yearStart={currentYear - YEARS_COUNT}
                            yearEnd={currentYear}
                            onChange={setYearStart}
                        />
                        <YearSelector
                            selectedYear={yearEnd}
                            yearStart={currentYear - YEARS_COUNT}
                            yearEnd={currentYear}
                            onChange={setYearEnd}
                        />
                    </div>
                    <div className='content-right-bottom'>
                        {filteredData.length !== 0 ?
                            (<Graph data={filteredData}
                                type={selectedType}
                                yearStart={yearStart}
                                yearEnd={currentYear} />) : (<div className='empty-view'>Загрузка данных...</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WeatherView;
