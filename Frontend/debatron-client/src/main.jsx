// E:\Debatron\Frontend\my-debate-arena-frontend\src\main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap CSS
import './index.css'; // Your custom CSS (if any, keep it minimal)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);