import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: '20px'
    }}>
      <div className="card card-elevated fade-in" style={{ 
        maxWidth: '450px', 
        width: '100%',
        padding: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
          <h2 style={{ 
            color: 'var(--primary)', 
            marginBottom: '8px',
            fontSize: '28px',
            fontWeight: '800'
          }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Continue your learning journey
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700'
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }}></div>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '28px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border)'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
          </span>
          <span 
            onClick={() => navigate('/register')} 
            style={{ 
              color: 'var(--primary)', 
              cursor: 'pointer', 
              fontWeight: '700',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            Sign Up
          </span>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius)',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            🎯 Master any topic with AI-powered learning
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;