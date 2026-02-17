import { useState, useEffect } from 'react';
import { analyticsAPI, gamificationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import BadgeCard from '../components/BadgeCard';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [progress, setProgress] = useState(null);
  const [badges, setBadges] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [analyticsRes, progressRes, badgesRes, weakRes] = await Promise.all([
        analyticsAPI.get(),
        analyticsAPI.getProgress(),
        gamificationAPI.getBadges(),
        gamificationAPI.getWeakTopics()
      ]);
      
      setAnalytics(analyticsRes.data);
      setProgress(progressRes.data);
      setBadges(badgesRes.data);
      setWeakTopics(weakRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const completionRate = progress?.completion_rate || 0;
  const avgScore = ((progress?.avg_score || 0) * 100).toFixed(0);

  return (
    <div className="container">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 1024 ? '280px 1fr' : '1fr', 
        gap: '24px' 
      }}>
        {window.innerWidth > 1024 && <Sidebar />}
        
        <div>
          <div className="card card-elevated fade-in" style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>
              📊 Learning Analytics
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Track your progress and achievements
            </p>
          </div>

          <div className="grid grid-3 slide-in" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-label">Total Sessions</div>
              <div className="metric-value">{progress?.total_sessions || 0}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Completed</div>
              <div className="metric-value" style={{ color: 'var(--success)' }}>
                {progress?.completed_sessions || 0}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Average Score</div>
              <div className="metric-value" style={{ 
                color: avgScore >= 80 ? 'var(--success)' : avgScore >= 60 ? 'var(--warning)' : 'var(--error)'
              }}>
                {avgScore}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Total Checkpoints</div>
              <div className="metric-value">{progress?.total_checkpoints || 0}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Completed</div>
              <div className="metric-value" style={{ color: 'var(--success)' }}>
                {progress?.completed_checkpoints || 0}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Completion Rate</div>
              <div className="metric-value" style={{ 
                color: completionRate >= 70 ? 'var(--success)' : completionRate >= 50 ? 'var(--warning)' : 'var(--error)'
              }}>
                {completionRate.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="grid grid-2 slide-in" style={{ marginBottom: '24px', animationDelay: '0.1s' }}>
            <div className="card">
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>🔥 Streak Info</h3>
              <div style={{ 
                padding: '20px', 
                background: 'var(--surface-elevated)', 
                borderRadius: 'var(--radius)',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  Current Streak
                </div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--primary)' }}>
                  {analytics?.current_streak || 0} days 🔥
                </div>
              </div>
              <div style={{ 
                padding: '20px', 
                background: 'var(--surface-elevated)', 
                borderRadius: 'var(--radius)'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  Longest Streak
                </div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--secondary)' }}>
                  {analytics?.longest_streak || 0} days ⭐
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>📈 Learning Stats</h3>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '12px',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Sessions Completed
                  </span>
                  <span style={{ fontWeight: '700', color: 'var(--success)', fontSize: '18px' }}>
                    {analytics?.completed_sessions || 0}/{analytics?.total_sessions || 0}
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '10px' }}>
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${analytics?.total_sessions > 0 
                        ? (analytics?.completed_sessions / analytics?.total_sessions * 100) 
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '12px',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Total Checkpoints
                  </span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '18px' }}>
                    {analytics?.total_checkpoints || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {weakTopics.length > 0 && (
            <div className="card slide-in" style={{ marginBottom: '24px', animationDelay: '0.2s' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>
                📝 Areas to Review
              </h3>
              {weakTopics.map((weak, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    borderLeft: '4px solid var(--warning)',
                    borderRadius: 'var(--radius)',
                    padding: '16px 20px',
                    marginBottom: '12px',
                    transition: 'all 0.3s ease'
                  }}
                  className="fade-in"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    {weak.topic}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {weak.concept}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="progress-bar" style={{ height: '8px', flex: 1 }}>
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${weak.strength_score * 100}%`,
                          background: 'linear-gradient(90deg, var(--warning), var(--secondary))'
                        }}
                      ></div>
                    </div>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: 'var(--warning)',
                      minWidth: '45px',
                      textAlign: 'right'
                    }}>
                      {(weak.strength_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {badges.length > 0 && (
            <div className="card slide-in" style={{ animationDelay: '0.3s' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>🏆 Your Badges</h3>
              <div className="badge-grid">
                {badges.map((badge, idx) => (
                  <div key={badge.id} className="fade-in" style={{ animationDelay: `${0.4 + idx * 0.05}s` }}>
                    <BadgeCard badge={badge} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;