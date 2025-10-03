import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Science Map</h1>
      <p>Interactive scientific visualization platform</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => fetch('/api/health').then(r => r.json()).then(data => {
            // В продакшене здесь будет структурированное логирование
          })}
          style={{ padding: '10px 20px', marginRight: '10px' }}
        >
          Check Health
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
