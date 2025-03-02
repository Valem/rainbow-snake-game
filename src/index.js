import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Add console logging to help debug
console.log('Starting React application...');

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log('Root element found:', document.getElementById('root'));
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error rendering React application:', error);
}