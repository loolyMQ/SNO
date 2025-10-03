import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useHealthStore } from './store/health';

function Layout({ children }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>Science Map</h1>
        <nav style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
          <Link to="/">Home</Link>
          <Link to="/health">Health</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

Layout.propTypes = {
  children: PropTypes.node
};

function HomePage() {
  return (
    <section>
      <p>Interactive scientific visualization platform</p>
    </section>
  );
}

function HealthPage() {
  const { status, loading, error, check } = useHealthStore();

  return (
    <section>
      <button onClick={check} style={{ padding: '10px 20px', marginRight: '10px' }} disabled={loading}>
        Check Health
      </button>
      {loading && <span>Loading...</span>}
      {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
      {status && (
        <pre style={{ marginTop: '12px', background: '#f5f5f5', padding: '12px', borderRadius: '6px' }}>
{JSON.stringify(status, null, 2)}
        </pre>
      )}
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/health" element={<HealthPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
