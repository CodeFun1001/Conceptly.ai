import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionAPI, gamificationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import BadgeCard from '../components/BadgeCard';
import SessionCard from '../components/SessionCard';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [tutorMode, setTutorMode] = useState(user?.tutor_mode || 'supportive_buddy');
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [sessionsRes, badgesRes, challengeRes] = await Promise.all([
        sessionAPI.getAll(),
        gamificationAPI.getBadges(),
        gamificationAPI.getDailyChallenge()
      ]);
      
      setSessions(sessionsRes.data.slice(0, 5));
      setBadges(badgesRes.data.slice(0, 6));
      setChallenge(challengeRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTutorModeChange = async (mode) => {
    try {
      const response = await gamificationAPI.updateTutorMode(mode);
      setTutorMode(mode);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to update tutor mode:', error);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setCreating(true);
    try {
      const response = await sessionAPI.create({ topic: newTopic, user_notes: '' });
      navigate(`/session/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  };

  const xpForNextLevel = user ? user.level * 100 : 100;
  const xpProgress = user ? (user.xp % xpForNextLevel) : 0;
  const xpPercentage = (xpProgress / xpForNextLevel) * 100;

  const tutorModes = [
    { value: 'chill_friend', label: '😎 Chill Friend', desc: 'Casual and fun' },
    { value: 'strict_mentor', label: '📚 Strict Mentor', desc: 'Thorough and precise' },
    { value: 'supportive_buddy', label: '🤗 Supportive Buddy', desc: 'Encouraging and positive' },
    { value: 'exam_mode', label: '🎯 Exam Mode', desc: 'Focused on assessments' }
  ];

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 1024 ? '280px 1fr' : '1fr', 
        gap: '24px' 
      }}>
        {window.innerWidth > 1024 && <Sidebar />}
        
        <div>
          <div className="card card-elevated fade-in" style={{ 
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
            color: 'white', 
            marginBottom: '24px',
            border: 'none'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>
              Welcome back, {user?.name}! 👋
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: '600' }}>Level {user?.level}</span>
                  <span style={{ 
                    marginLeft: '12px', 
                    padding: '4px 12px', 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '20px',
                    fontSize: '14px'
                  }}>
                    {user?.xp} XP
                  </span>
                </div>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>
                  {xpProgress}/{xpForNextLevel} XP
                </span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${xpPercentage}%` }}>
                  {xpPercentage > 15 && `${Math.round(xpPercentage)}%`}
                </div>
              </div>
            </div>
            <p style={{ opacity: 0.95, margin: 0, fontSize: '15px' }}>
              Keep learning to reach Level {user?.level + 1}!
            </p>
          </div>

          <div className="grid grid-2 slide-in" style={{ marginBottom: '24px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>🎯 Daily Challenge</h3>
              {challenge && (
                <>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
                    {challenge.task}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      color: '#FFD700', 
                      fontWeight: '700', 
                      fontSize: '16px',
                      padding: '6px 12px',
                      background: 'rgba(255, 215, 0, 0.1)',
                      borderRadius: 'var(--radius)'
                    }}>
                      +{challenge.bonus_xp} XP
                    </span>
                    {challenge.completed ? (
                      <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '16px' }}>
                        ✓ Completed
                      </span>
                    ) : (
                      <span style={{ color: 'var(--warning)', fontWeight: '600', fontSize: '16px' }}>
                        In Progress
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>🎭 Tutor Personality</h3>
              <select 
                value={tutorMode} 
                onChange={(e) => handleTutorModeChange(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: 'var(--radius)', 
                  border: '2px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: '500'
                }}
              >
                {tutorModes.map(mode => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label} - {mode.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card slide-in" style={{ marginBottom: '24px', animationDelay: '0.1s' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>🚀 Start New Learning Journey</h3>
            <form onSubmit={handleCreateSession} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="What would you like to learn today?"
                style={{ 
                  flex: '1', 
                  minWidth: '250px',
                  padding: '14px 20px', 
                  borderRadius: 'var(--radius)', 
                  border: '2px solid var(--border)',
                  fontSize: '15px',
                  background: 'var(--background)',
                  color: 'var(--text-primary)'
                }}
              />
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Start Learning'}
              </button>
            </form>
          </div>

          {badges.length > 0 && (
            <div className="card slide-in" style={{ marginBottom: '24px', animationDelay: '0.2s' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>🏆 Recent Badges</h3>
              <div className="badge-grid">
                {badges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          )}

          <div className="card slide-in" style={{ animationDelay: '0.3s' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>📚 Recent Sessions</h3>
            {sessions.length > 0 ? (
              sessions.map((session, idx) => (
                <div key={session.id} style={{ animationDelay: `${0.4 + idx * 0.05}s` }} className="fade-in">
                  <SessionCard session={session} />
                </div>
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📖</div>
                <p style={{ fontSize: '16px' }}>
                  No sessions yet. Start your first learning journey above!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;