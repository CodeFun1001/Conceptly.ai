import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/history', label: 'History', icon: '📚' },
    { path: '/analytics', label: 'Analytics', icon: '📊' }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/*Toggle Button*/}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Overlay*/}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <h3 style={{ 
          marginBottom: '24px', 
          color: 'var(--primary)',
          fontSize: '18px',
          fontWeight: '700'
        }}>
          Navigation
        </h3>
        {menuItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '15px' }}>{item.label}</span>
          </div>
        ))}
        
        {/* Quick Stats */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)'
        }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '700', 
            marginBottom: '12px',
            color: 'var(--text-primary)'
          }}>
            💡 Quick Tips
          </h4>
          <ul style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)',
            marginLeft: '20px',
            lineHeight: '1.6'
          }}>
            <li>Complete checkpoints sequentially</li>
            <li>Review weak areas regularly</li>
            <li>Maintain your daily streak</li>
            <li>Try different tutor modes</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;