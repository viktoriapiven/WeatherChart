import React, { useMemo } from 'react';

// контролл выбора периода
export default function YearSelector(props:
    {
        yearStart: number,
        yearEnd: number,
        selectedYear: number,
        onChange: Function
    }) {
    // соберем массив годов, которые будут в выпадающем списке
    const years = useMemo(() => {
        const yearsArray = [];
        for (let y = props.yearEnd; y >= props.yearStart; y--) {
            yearsArray.push(y);
        }
        return yearsArray;
    }, [props.yearStart, props.yearEnd]);

    return (
        <select value={props.selectedYear}
            onChange={event => props.onChange(Number(event.target.value))}
            className='yearSelector'>
            {years.map(year => (
                <option key={year} value={year}>
                    {year}
                </option>
            ))}
        </select>
    );
}