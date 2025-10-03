import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <Link to="/" className="header-logo">
            <img src="/logo.svg" alt="Science Map Platform" className="header-logo-img" />
            <span className="header-logo-text">Science Map Platform</span>
          </Link>
        </div>

        <nav className={`header-nav ${isMenuOpen ? 'header-nav-open' : ''}`}>
          <ul className="header-nav-list">
            <li className="header-nav-item">
              <Link to="/" className="header-nav-link">Home</Link>
            </li>
            <li className="header-nav-item">
              <Link to="/search" className="header-nav-link">Search</Link>
            </li>
            <li className="header-nav-item">
              <Link to="/graph" className="header-nav-link">Graph</Link>
            </li>
            <li className="header-nav-item">
              <Link to="/jobs" className="header-nav-link">Jobs</Link>
            </li>
            {user?.role === 'admin' && (
              <li className="header-nav-item">
                <Link to="/admin" className="header-nav-link">Admin</Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="header-auth">
          {user ? (
            <div className="header-user">
              <span className="header-user-name">{user.email}</span>
              <div className="header-user-menu">
                <button className="header-user-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="header-auth-buttons">
              <Link to="/login" className="header-auth-link">Login</Link>
              <Link to="/register" className="header-auth-link header-auth-link-primary">Register</Link>
            </div>
          )}
        </div>

        <button 
          className="header-menu-toggle"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="header-menu-icon"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
