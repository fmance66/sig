import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './styles/compact-inputs.css';
import './styles/global-tables.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
