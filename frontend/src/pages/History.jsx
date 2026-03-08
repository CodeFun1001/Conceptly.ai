import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, gamificationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';

const statusColors = {
  in_progress: '#F59E0B',
  completed:   '#10B981',
  pending:     '#94A3B8',
};

const History = () => {
  const navigate = useNavigate();
  const [sessions,      setSessions]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [noteType,      setNoteType]      = useState({});

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await analyticsAPI.getHistory();
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNoteType = (sessionId) => noteType[sessionId] || 'comprehensive';

  const handleDownloadNotes = async (e, session) => {
    e.stopPropagation();
    if (downloadingId) return;
    const type = getNoteType(session.id);
    setDownloadingId(session.id);
    try {
      const res = await gamificationAPI.generateSmartNotes(session.id, type);
      const content = res.data.content || '';
      const suffixes = { comprehensive: 'notes', cheatsheet: 'cheatsheet', questions: 'practice_questions' };
      const blob = new Blob([content], { type: 'text/markdown' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${session.topic.replace(/\s+/g, '_')}_${suffixes[type]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Notes generation failed:', err);
      alert('Failed to generate notes. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCardClick = (session) => {
    if (session.status === 'completed') {
      navigate(`/completion/${session.id}`);
    } else {
      navigate(`/session/${session.id}`);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading history...</p>
      </div>
    );
  }

  const noteOptions = [
    { value: 'comprehensive', label: '📄 Full Notes' },
    { value: 'cheatsheet',    label: '📋 Cheat Sheet' },
    { value: 'questions',     label: '❓ Practice Qs' },
  ];

  const completedSessions  = sessions.filter(s => s.status === 'completed');
  const inProgressSessions = sessions.filter(s => s.status !== 'completed');

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 1024 ? '280px 1fr' : '1fr', gap: '24px' }}>
        {window.innerWidth > 1024 && <Sidebar />}

        <div>
          <div className="card card-elevated fade-in" style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: 'white', marginBottom: '24px', border: 'none',
          }}>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '26px' }}>📚 Learning History</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
              {completedSessions.length} completed · {inProgressSessions.length} in progress
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <h3 style={{ color: 'var(--text-secondary)' }}>No sessions yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Start your first learning journey to see your history</p>
            </div>
          ) : (
            <>
              {completedSessions.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#10B981', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✅ Completed Sessions
                    <span style={{ fontSize: '13px', fontWeight: '500', background: '#10B98118', color: '#10B981', padding: '2px 10px', borderRadius: '20px', border: '1px solid #10B98144' }}>
                      {completedSessions.length}
                    </span>
                  </h2>

                  {completedSessions.map(session => {
                    const isDownloading = downloadingId === session.id;
                    const currentType   = getNoteType(session.id);

                    return (
                      <div
                        key={session.id}
                        className="card fade-in"
                        onClick={() => handleCardClick(session)}
                        style={{
                          cursor: 'pointer', marginBottom: '12px',
                          borderLeft: '5px solid #10B981',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
                                {session.topic}
                              </h3>
                              <span style={{
                                fontSize: '11px', fontWeight: '700', padding: '2px 10px',
                                borderRadius: '20px', background: '#10B98118', color: '#10B981',
                                border: '1px solid #10B98144', textTransform: 'uppercase', letterSpacing: '0.5px',
                              }}>
                                Completed
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <span>📅 Started {new Date(session.created_at).toLocaleDateString()}</span>
                              {session.completed_at && (
                                <span>🏁 Completed {new Date(session.completed_at).toLocaleDateString()}</span>
                              )}
                              {session.xp_earned > 0 && (
                                <span style={{ color: '#F59E0B', fontWeight: '700' }}>+{session.xp_earned} XP</span>
                              )}
                            </div>
                          </div>

                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <select
                              value={currentType}
                              onChange={e => setNoteType(prev => ({ ...prev, [session.id]: e.target.value }))}
                              style={{
                                padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
                                border: '1.5px solid var(--border)', background: 'var(--background)',
                                color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              {noteOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>

                            <button
                              onClick={(e) => handleDownloadNotes(e, session)}
                              disabled={isDownloading}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '7px 14px', borderRadius: '8px', fontSize: '12px',
                                fontWeight: '700', cursor: isDownloading ? 'not-allowed' : 'pointer',
                                border: 'none', whiteSpace: 'nowrap',
                                background: isDownloading ? '#94A3B8' : 'var(--primary)',
                                color: 'white', transition: 'background 0.2s',
                                opacity: isDownloading ? 0.7 : 1,
                              }}
                            >
                              {isDownloading ? '⏳ Generating...' : '📥 Notes'}
                            </button>

                            <span style={{ color: '#10B981', fontSize: '18px', fontWeight: '700' }}>🎉 →</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {inProgressSessions.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#F59E0B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⏳ In Progress
                    <span style={{ fontSize: '13px', fontWeight: '500', background: '#F59E0B18', color: '#F59E0B', padding: '2px 10px', borderRadius: '20px', border: '1px solid #F59E0B44' }}>
                      {inProgressSessions.length}
                    </span>
                  </h2>

                  {inProgressSessions.map(session => (
                    <div
                      key={session.id}
                      className="card fade-in"
                      onClick={() => handleCardClick(session)}
                      style={{
                        cursor: 'pointer', marginBottom: '12px',
                        borderLeft: `5px solid ${statusColors[session.status] || '#94A3B8'}`,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
                              {session.topic}
                            </h3>
                            <span style={{
                              fontSize: '11px', fontWeight: '700', padding: '2px 10px',
                              borderRadius: '20px', background: '#F59E0B18', color: '#F59E0B',
                              border: '1px solid #F59E0B44', textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              In Progress
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            📅 Started {new Date(session.created_at).toLocaleDateString()}
                            {session.xp_earned > 0 && (
                              <span style={{ marginLeft: '12px', color: '#F59E0B', fontWeight: '700' }}>+{session.xp_earned} XP so far</span>
                            )}
                          </div>
                        </div>
                        <span style={{ color: '#F59E0B', fontSize: '16px', fontWeight: '700', flexShrink: 0 }}>▶ Continue →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;