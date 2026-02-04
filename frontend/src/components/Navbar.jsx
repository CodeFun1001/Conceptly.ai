import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useState(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  const handleBrandClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand" onClick={handleBrandClick}>
          <h1>🧠 Conceptly</h1>
          <span className="badge" style={{ 
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
            color: 'white',
            fontSize: '11px',
            padding: '4px 10px'
          }}>
            AI Learning
          </span>
        </div>
        
        <div className="navbar-actions">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
            <span style={{ marginLeft: '4px' }}>
              {theme === 'light' ? 'Dark' : 'Light'}
            </span>
          </button>
          
          {user && (
            <>
              <div className="level-badge">
                Level {user.level}
              </div>
              <span style={{ 
                color: 'var(--text-secondary)', 
                marginLeft: '8px',
                fontWeight: '600'
              }}>
                {user.xp} XP
              </span>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="btn btn-secondary"
              >
                Dashboard
              </button>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary btn-icon"
                title="Logout"
              >
                🔒
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card card-elevated" style={{
            maxWidth: '400px',
            padding: '32px',
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
            <h3 style={{ marginBottom: '12px', color: 'var(--primary)' }}>
              Logout Confirmation
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to logout? Your progress is saved!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                className="btn btn-primary"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;