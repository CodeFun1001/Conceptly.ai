import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, sessionAPI, gamificationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';

const History = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await analyticsAPI.getHistory();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNotes = async (e, session) => {
    e.stopPropagation(); 
    setDownloadingId(session.id);
    try {
      const response = await gamificationAPI.generateSmartNotes(session.id);
      const notes = response.data.content;
      const blob = new Blob([notes], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.topic.replace(/\s+/g, '_')}_notes.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download notes:', error);
      alert('Failed to generate notes. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSessionClick = (session) => {
    if (session.status === 'completed') {
      navigate(`/completion/${session.id}`);
    } else {
      navigate(`/session/${session.id}`);
    }
  };

  const statusColors = {
    in_progress: '#FF9800',
    completed: '#4CAF50',
    pending: '#999'
  };

  if (loading) {
    return <div className="loading">Loading history...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
        <Sidebar />

        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: '0 0 8px 0' }}>📚 Learning History</h1>
            <p style={{ color: '#666', margin: 0 }}>Your complete learning journey</p>
          </div>

          {sessions.length > 0 ? (
            <div>
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderLeft: `5px solid ${statusColors[session.status] || '#999'}`,
                    marginBottom: '16px',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => handleSessionClick(session)}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>{session.topic}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 4px 0' }}>
                        Started: {new Date(session.created_at).toLocaleDateString()}
                      </p>
                      {session.completed_at && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 4px 0' }}>
                          Completed: {new Date(session.completed_at).toLocaleDateString()}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: statusColors[session.status] || '#999',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}
                        >
                          {session.status.replace('_', ' ')}
                        </span>
                        {session.xp_earned > 0 && (
                          <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '14px' }}>
                            +{session.xp_earned} XP
                          </span>
                        )}
                        {session.status === 'completed' && (
                          <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                            🎉 View Results →
                          </span>
                        )}
                        {session.status === 'in_progress' && (
                          <span style={{ fontSize: '13px', color: '#FF9800', fontWeight: '600' }}>
                            ▶ Continue →
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Download Notes button */}
                    <button
                      onClick={(e) => handleDownloadNotes(e, session)}
                      disabled={downloadingId === session.id}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 'var(--radius)',
                        border: '2px solid var(--primary)',
                        background: 'transparent',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: downloadingId === session.id ? 'wait' : 'pointer',
                        flexShrink: 0,
                        marginLeft: '16px',
                        transition: 'all 0.2s ease',
                        opacity: downloadingId === session.id ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={e => {
                        if (downloadingId !== session.id) {
                          e.currentTarget.style.background = 'var(--primary)';
                          e.currentTarget.style.color = 'white';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                    >
                      {downloadingId === session.id ? (
                        <>⏳ Generating...</>
                      ) : (
                        <>📥 Download Notes</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <h3 style={{ color: '#666' }}>No sessions yet</h3>
              <p style={{ color: '#999' }}>Start your first learning journey to see your history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;