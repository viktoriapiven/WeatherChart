import React from 'react';
import ReactDOM from 'react-dom/client';
import WeatherView from './content/WeatherView';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <WeatherView />
    </React.StrictMode>
);
