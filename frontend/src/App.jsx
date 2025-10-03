import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import Graph from './pages/Graph';
import Jobs from './pages/Jobs';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import './App.css';

const App = () => {
  const { user } = useAuthStore();

  return (
    <Router>
      <div className="app">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route 
              path="/admin" 
              element={
                user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" replace /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/" replace /> : <Register />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <div className="app-footer-content">
            <p>&copy; 2024 Science Map Platform. All rights reserved.</p>
            <div className="app-footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
