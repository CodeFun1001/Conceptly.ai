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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    loadAnalytics();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  const totalCheckpoints = progress?.total_checkpoints || 0;
  const completedCheckpoints = progress?.completed_checkpoints || 0;
  const pendingCheckpoints = totalCheckpoints - completedCheckpoints;

  return (
    <div className="container">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', 
        gap: '24px' 
      }}>
        {!isMobile && <Sidebar />}
        
        <div>
          <div className="card card-elevated fade-in" style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: '0 0 8px 0', color: 'var(--primary)', fontSize: isMobile ? '24px' : '28px' }}>
              📊 Learning Analytics
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: isMobile ? '14px' : '15px' }}>
              Track your progress and achievements
            </p>
          </div>

          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }} className="slide-in">
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
              <div className="metric-value">{totalCheckpoints}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Completed</div>
              <div className="metric-value" style={{ color: 'var(--success)' }}>
                {completedCheckpoints}
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

          {/* Charts Section */}
          <div
            className="slide-in"
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '24px',
              marginBottom: '24px',
              animationDelay: '0.1s'
            }}
          >
            {/* Checkpoint Progress Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '18px' : '20px' }}>
                📈 Checkpoint Progress
              </h3>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '20px',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '16px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: 'var(--success)', marginBottom: '8px' }}>
                    {completedCheckpoints}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Completed
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '16px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: 'var(--warning)', marginBottom: '8px' }}>
                    {pendingCheckpoints}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Pending
                  </div>
                </div>
              </div>
              
              {/* Simple Bar Chart */}
              <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '20px', padding: '20px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ 
                    height: `${totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints * 160) : 0}px`,
                    background: 'linear-gradient(180deg, var(--success), #059669)',
                    borderRadius: '8px 8px 0 0',
                    marginBottom: '8px',
                    transition: 'height 0.3s ease'
                  }}></div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Completed</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ 
                    height: `${totalCheckpoints > 0 ? (pendingCheckpoints / totalCheckpoints * 160) : 0}px`,
                    background: 'linear-gradient(180deg, var(--warning), #d97706)',
                    borderRadius: '8px 8px 0 0',
                    marginBottom: '8px',
                    transition: 'height 0.3s ease'
                  }}></div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Pending</div>
                </div>
              </div>
            </div>

            {/* Streak Info */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '18px' : '20px' }}>🔥 Streak Info</h3>
              <div style={{ 
                padding: isMobile ? '16px' : '20px', 
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
                <div style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: '800', color: 'var(--primary)' }}>
                  {analytics?.current_streak || 0} days 🔥
                </div>
              </div>
              <div style={{ 
                padding: isMobile ? '16px' : '20px', 
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
                <div style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: '800', color: 'var(--secondary)' }}>
                  {analytics?.longest_streak || 0} days ⭐
                </div>
              </div>
            </div>
          </div>

          {/* Score Distribution */}
          <div className="card slide-in" style={{ marginBottom: '24px', animationDelay: '0.15s' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '18px' : '20px' }}>
              📊 Performance Overview
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: isMobile ? '14px' : '15px' }}>
                  Sessions Completed
                </span>
                <span style={{ fontWeight: '700', color: 'var(--success)', fontSize: isMobile ? '16px' : '18px' }}>
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
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: isMobile ? '14px' : '15px' }}>
                  Average Performance
                </span>
                <span style={{ 
                  fontWeight: '700', 
                  color: avgScore >= 80 ? 'var(--success)' : avgScore >= 60 ? 'var(--warning)' : 'var(--error)', 
                  fontSize: isMobile ? '16px' : '18px' 
                }}>
                  {avgScore}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: '10px' }}>
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${avgScore}%`,
                    background: avgScore >= 80 ? 'var(--success)' : avgScore >= 60 ? 'var(--warning)' : 'var(--error)'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Weak Topics */}
          {weakTopics.length > 0 && (
            <div className="card slide-in" style={{ marginBottom: '24px', animationDelay: '0.2s' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '18px' : '20px' }}>
                🔍 Areas to Review
              </h3>
              {weakTopics.map((weak, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    borderLeft: '4px solid var(--warning)',
                    borderRadius: 'var(--radius)',
                    padding: isMobile ? '14px 16px' : '16px 20px',
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
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)', fontSize: isMobile ? '14px' : '15px' }}>
                    {weak.topic}
                  </div>
                  <div style={{ fontSize: isMobile ? '13px' : '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
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

          {/* Badges */}
          {badges.length > 0 && (
            <div className="card slide-in" style={{ animationDelay: '0.3s' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '18px' : '20px' }}>
                🏆 Your Badges
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px'
              }}>
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