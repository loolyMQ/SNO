import React, { useState, useEffect, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import NetworkError from './components/NetworkError.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import ErrorTester from './components/ErrorTester.jsx';
import { registerServiceWorker } from './utils/serviceWorker.js';

// Ленивая загрузка роутера
const Router = lazy(() => import('./components/Router.jsx'));

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setLoading(true);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setNetworkError(null);
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch((error) => {
        console.error('Auth check failed:', error);
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          setNetworkError(error.message);
        } else {
          localStorage.removeItem('token');
        }
      })
      .finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setNetworkError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
        setNetworkError(null);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        setNetworkError(error.message);
        return { success: false, error: 'Ошибка сети. Проверьте подключение к интернету.' };
      }
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const retryConnection = () => {
    setNetworkError(null);
    setLoading(false);
    // Автоматически повторяем проверку авторизации
    const token = localStorage.getItem('token');
    if (token) {
      setLoading(true);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(data => {
        if (data.success) {
          setUser(data.user);
          setNetworkError(null);
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch((error) => {
        console.error('Retry auth check failed:', error);
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          setNetworkError(error.message);
        } else {
          localStorage.removeItem('token');
        }
      })
      .finally(() => setLoading(false));
    }
  };

  return { user, loading, login, logout, networkError, retryConnection };
};

const Header = ({ user, onLogout }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f0f0f0'
  }}>
    <h1 style={{ 
      color: '#333', 
      margin: 0,
      fontSize: '2.5rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }}>
      🗺️ Карта науки
    </h1>
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', color: '#333' }}>{user.name}</div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>{user.email}</div>
        <div style={{ 
          color: user.role === 'ADMIN' ? '#e74c3c' : '#27ae60',
          fontSize: '0.8rem',
          fontWeight: 'bold'
        }}>
          {user.role === 'ADMIN' ? '👑 Администратор' : '👤 Пользователь'}
        </div>
      </div>
      <button 
        onClick={onLogout}
        style={{
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '25px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
        }}
        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
      >
        Выйти
      </button>
    </div>
  </div>
);

const FeatureCard = ({ title, description, gradient, shadowColor }) => (
  <div style={{
    background: gradient,
    color: 'white',
    padding: '30px',
    borderRadius: '15px',
    textAlign: 'center',
    boxShadow: `0 10px 30px ${shadowColor}`
  }}>
    <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5rem' }}>{title}</h3>
    <p style={{ margin: 0, opacity: 0.9 }}>{description}</p>
  </div>
);

const LoginForm = ({ onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onLogin(email, password);
    if (result.success) {
      setEmail('');
      setPassword('');
    } else {
      alert('Ошибка входа: ' + result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          color: '#333',
          fontWeight: 'bold'
        }}>
          Email:
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '15px',
            border: '2px solid #e9ecef',
            borderRadius: '10px',
            fontSize: '1rem',
            transition: 'border-color 0.3s ease',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          placeholder="Введите ваш email"
        />
      </div>
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          color: '#333',
          fontWeight: 'bold'
        }}>
          Пароль:
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '15px',
            border: '2px solid #e9ecef',
            borderRadius: '10px',
            fontSize: '1rem',
            transition: 'border-color 0.3s ease',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          placeholder="Введите ваш пароль"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          background: loading 
            ? '#ccc' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          padding: '15px',
          borderRadius: '10px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
        }}
        onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
        onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
      >
        {loading ? 'Вход...' : 'Войти в систему'}
      </button>
    </form>
  );
};
function App() {
  const { user, loading, login, logout, networkError, retryConnection } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('dashboard');

  const handleNavigate = (route) => {
    setCurrentRoute(route);
  };

  // Инициализация Service Worker
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker();
    }
  }, []);

  // Показываем загрузку при начальной проверке авторизации
  if (loading && !user && !networkError) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LoadingSpinner message="Проверка авторизации..." size="large" />
      </div>
    );
  }

  // Показываем ошибку сети если есть
  if (networkError && !user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          width: '100%'
        }}>
          <NetworkError 
            message="Не удалось подключиться к серверу" 
            onRetry={retryConnection} 
          />
        </div>
      </div>
    );
  }
  if (user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <Header user={user} onLogout={logout} />
          
          {/* Ленивая загрузка роутера */}
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <LoadingSpinner message="Инициализация приложения..." size="large" />
            </div>
          }>
            <Router 
              currentRoute={currentRoute} 
              user={user} 
              onNavigate={handleNavigate} 
            />
          </Suspense>
        </div>
      </div>
    );
  }
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        background: 'white',
        borderRadius: '20px',
        padding: '50px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        margin: '20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            color: '#333', 
            margin: '0 0 10px 0',
            fontSize: '3rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🗺️ Карта науки
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>
            Войдите в систему для доступа к платформе
          </p>
        </div>
        <LoginForm onLogin={login} loading={loading} />
        <div style={{ 
          marginTop: '30px', 
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '10px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Тестовые аккаунты:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <div>
                <strong style={{ color: '#e74c3c' }}>👑 Администратор</strong>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>admin@science-map.com</div>
              </div>
              <div style={{ color: '#27ae60', fontWeight: 'bold' }}>admin123</div>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <div>
                <strong style={{ color: '#3498db' }}>👤 Пользователь</strong>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>user@science-map.com</div>
              </div>
              <div style={{ color: '#27ae60', fontWeight: 'bold' }}>user123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
    <ErrorTester />
  </ErrorBoundary>
);