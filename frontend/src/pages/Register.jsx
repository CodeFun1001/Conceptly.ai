import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const cleanConfirm = confirmPassword.trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    setError('All fields are required');
    return;
  }

  if (cleanPassword !== cleanConfirm) {
    setError('Passwords do not match');
    return;
  }

  if (cleanPassword.length < 6) {
    setError('Password must be at least 6 characters');
    return;
  }

  if (cleanPassword.length > 72) {
    setError('Password must be less than 72 characters');
    return;
  }

  const strongPassword =
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;

  if (!strongPassword.test(cleanPassword)) {
    setError('Password must contain letters and numbers');
    return;
  }

  setLoading(true);

  try {
    await register(
      cleanName,
      cleanEmail,
      cleanPassword
    );

    navigate('/dashboard');

  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Registration failed. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', color: '#4392F1', marginBottom: '24px' }}>
          Create Account
        </h2>

        {error && (
          <div className="alert alert-warning">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          Already have an account?{' '}
          <span 
            onClick={() => navigate('/login')} 
            style={{ color: '#4392F1', cursor: 'pointer', fontWeight: '600' }}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;