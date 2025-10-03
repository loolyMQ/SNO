import React from 'react';
import { Link } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">
            Discover Scientific Knowledge
          </h1>
          <p className="home-subtitle">
            Explore the interconnected world of scientific research through our advanced mapping platform
          </p>
          
          <div className="home-search">
            <SearchForm />
          </div>
          
          <div className="home-features">
            <div className="home-feature">
              <div className="home-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10,8 16,12 10,16 10,8"></polygon>
                </svg>
              </div>
              <h3>Advanced Search</h3>
              <p>Find papers with intelligent search algorithms</p>
            </div>
            
            <div className="home-feature">
              <div className="home-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h3>Knowledge Graphs</h3>
              <p>Visualize connections between research papers</p>
            </div>
            
            <div className="home-feature">
              <div className="home-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 19c-5 0-7-2-7-7s2-7 7-7 7 2 7 7-2 7-7 7z"></path>
                  <path d="M15 13l3 3-3 3"></path>
                </svg>
              </div>
              <h3>Analytics</h3>
              <p>Track research trends and patterns</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="home-content">
        <div className="home-section">
          <h2>How It Works</h2>
          <div className="home-steps">
            <div className="home-step">
              <div className="home-step-number">1</div>
              <h3>Search</h3>
              <p>Enter your research query to find relevant papers</p>
            </div>
            
            <div className="home-step">
              <div className="home-step-number">2</div>
              <h3>Explore</h3>
              <p>Browse through search results and discover connections</p>
            </div>
            
            <div className="home-step">
              <div className="home-step-number">3</div>
              <h3>Visualize</h3>
              <p>View knowledge graphs to understand relationships</p>
            </div>
          </div>
        </div>
        
        <div className="home-section">
          <h2>Get Started</h2>
          <div className="home-actions">
            <Link to="/search" className="home-action-button home-action-primary">
              Start Searching
            </Link>
            <Link to="/graph" className="home-action-button home-action-secondary">
              View Graphs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
