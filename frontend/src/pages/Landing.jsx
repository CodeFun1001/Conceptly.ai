import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import { useEffect } from 'react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '48px', color: '#4392F1', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="logo" style={{ width: '48px' }} />
          Conceptly
        </h1>
        <p style={{ fontSize: '20px', color: '#666' }}>
          Your AI-Powered Mastery Learning Companion
        </p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '60px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h3 style={{ color: '#4392F1', marginBottom: '12px' }}>Adaptive Learning</h3>
          <p style={{ color: '#666' }}>Personalized checkpoints based on your level</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ color: '#4392F1', marginBottom: '12px' }}>Mastery-Based</h3>
          <p style={{ color: '#666' }}>Progress only when you truly understand</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
          <h3 style={{ color: '#4392F1', marginBottom: '12px' }}>Feynman Method</h3>
          <p style={{ color: '#666' }}>Simplified explanations when you struggle</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ marginBottom: '24px' }}>Ready to Start Learning?</h2>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/register')}
            style={{ fontSize: '16px', padding: '14px 32px' }}
          >
            Get Started
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/login')}
            style={{ fontSize: '16px', padding: '14px 32px' }}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;