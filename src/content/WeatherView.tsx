import { useState, useEffect, useMemo } from 'react';
import { initDataBase, getAllData } from '../db/indexedDB';
import YearSelector from './YearSelector';
import Graph from './Graph';
import { ItemData } from '../types';


// по ТЗ "последние 120 лет", но в json файлах и макете данные с 1881 по 2006,
//  т е 125 лет, оставим их чтобы график был красивый и не было провала после 2006
const START_DATE = '12.31.2006';
const YEARS_COUNT = 125;

function WeatherView() {
    const [dataBase, setDataBase] = useState(null);
    const currentYear = new Date(START_DATE).getFullYear();
    const [yearStart, setYearStart] = useState(currentYear - YEARS_COUNT);
    const [yearEnd, setYearEnd] = useState(currentYear);
    const [temperatureData, setTemperatureData] = useState([]);
    const [precipitationData, setPrecipitationData] = useState([]);
    const [selectedType, setSelectedType] = useState('temperature');

    useEffect(() => {
        initDataBase().then(setDataBase).catch(console.error);
    }, []);

    useEffect(() => {
        if (!dataBase) return;
        async function loadData() {
            const temp = await getAllData(dataBase, 'temperature');
            const prec = await getAllData(dataBase, 'precipitation');
            setTemperatureData(temp);
            setPrecipitationData(prec);
        }
        loadData();
    }, [dataBase]);

    function handleClick(type: string) {
        setSelectedType(type);
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
                            onClick={() => handleClick('temperature')}>
                            Температура
                        </button>
                    </div>
                    <div>
                        <button
                            id='precipitationButton'
                            className='button button-precipitation'
                            onClick={() => handleClick('precipitation')}>
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
                        <Graph data={filteredData}
                            type={selectedType}
                            yearStart={yearStart}
                            yearEnd={currentYear} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WeatherView;
