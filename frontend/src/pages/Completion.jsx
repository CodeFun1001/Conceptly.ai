import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, analyticsAPI, gamificationAPI } from '../services/api';
import BadgePopup from '../components/BadgePopup';
import confetti from 'canvas-confetti';

const CheckpointRow = ({ cpData, index }) => {
  const [open, setOpen] = useState(false);
  const cp     = cpData.checkpoint || cpData;
  const scores = cpData.scores || [];
  const totalAttempts = cpData.attempts || 0;

  const bestScore  = scores.length > 0 ? Math.max(...scores) : (cp.understanding_score || 0);
  const bestPct    = Math.round(bestScore * 100);
  const color      = bestPct >= 90 ? '#10B981' : bestPct >= 70 ? '#F59E0B' : '#EF4444';
  const emoji      = bestPct >= 90 ? '🌟' : bestPct >= 70 ? '👍' : '📖';

  const objectives = Array.isArray(cp.objectives) ? cp.objectives : [];
  const keyConcepts = Array.isArray(cp.key_concepts) ? cp.key_concepts : [];
  const checkpointName = cp.topic || `Checkpoint ${index + 1}`;

  return (
    <div style={{
      borderRadius: '14px',
      border: `2px solid ${color}44`,
      marginBottom: '12px',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', cursor: 'pointer',
          borderLeft: `5px solid ${color}`,
          background: open ? `${color}08` : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '22px' }}>{emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {checkpointName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''} · {objectives.length} objectives
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {scores.map((s, i) => {
              const pct = Math.round(s * 100);
              const isBest = s === Math.max(...scores);
              return (
                <span key={i} style={{
                  fontSize: '11px', fontWeight: '700',
                  padding: '2px 8px', borderRadius: '10px',
                  background: isBest ? color : `${color}22`,
                  color: isBest ? 'white' : color,
                  border: isBest ? 'none' : `1px solid ${color}55`,
                }}>
                  {isBest ? '★ ' : ''}{pct}%
                </span>
              );
            })}
            {scores.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No attempts yet</span>
            )}
          </div>

          <div style={{
            fontSize: '18px', fontWeight: '800', color,
            minWidth: '52px', textAlign: 'right',
          }}>
            {scores.length > 0 ? `${bestPct}%` : '—'}
          </div>

          <span style={{
            fontSize: '18px', color: 'var(--text-secondary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s',
            display: 'inline-block',
          }}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${color}22` }}>
          {objectives.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                📋 Learning Objectives
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.8' }}>
                {objectives.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul>
            </div>
          )}

          {keyConcepts.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                🧩 Key Concepts
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {keyConcepts.map((kc, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                    background: `${color}18`, color, border: `1px solid ${color}44`,
                  }}>
                    {kc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {scores.length > 1 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                📈 Attempt History
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                {scores.map((s, i) => {
                  const pct = Math.round(s * 100);
                  const isBest = s === Math.max(...scores);
                  return (
                    <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: isBest ? color : 'var(--text-secondary)', marginBottom: '4px' }}>
                        {pct}%
                      </div>
                      <div style={{
                        height: `${Math.max(pct * 0.6, 8)}px`,
                        background: isBest ? color : `${color}44`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>#{i + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Completion = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session,     setSession]     = useState(null);
  const [analytics,   setAnalytics]   = useState(null);
  const [notesType,   setNotesType]   = useState('comprehensive');
  const [notesContent, setNotesContent] = useState({});
  const [loadingNotes, setLoadingNotes] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [newBadges,   setNewBadges]   = useState([]);

  useEffect(() => {
    triggerCelebration();
    loadCompletionData();
  }, []);

  const triggerCelebration = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 50, angle:  60, spread: 55, origin: { x: 0 } }), 250);
    setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }), 400);
  };

  const loadCompletionData = async () => {
    try {
      const [sessionRes, analyticsRes] = await Promise.all([
        sessionAPI.getOne(sessionId),
        analyticsAPI.getSessionDetails(sessionId),
      ]);
      setSession(sessionRes.data);
      setAnalytics(analyticsRes.data);

      if (sessionRes.data.status !== 'completed') {
        await sessionAPI.completeSession(sessionId);
      }

      try {
        const badgeRes = await gamificationAPI.checkBadges();
        const earned = badgeRes?.data?.newly_awarded || [];
        if (earned.length > 0) setTimeout(() => setNewBadges(earned), 1200);
      } catch (e) { console.warn('Badge check failed:', e); }

      fetchNotes('comprehensive');
    } catch (error) {
      console.error('Failed to load completion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (type) => {
    if (notesContent[type]) return;   // already loaded
    setLoadingNotes(prev => ({ ...prev, [type]: true }));
    try {
      const res = await gamificationAPI.generateSmartNotes(sessionId, type);
      const content = res.data.content || '';
      setNotesContent(prev => ({ ...prev, [type]: content }));
    } catch (e) {
      console.warn(`Notes (${type}) failed:`, e);
      setNotesContent(prev => ({ ...prev, [type]: '# Notes generation failed\n\nPlease try again.' }));
    } finally {
      setLoadingNotes(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleNotesTypeChange = (type) => {
    setNotesType(type);
    fetchNotes(type);
  };

  const downloadNotes = () => {
    const content = notesContent[notesType];
    if (!content) return;
    const suffixes = { comprehensive: 'notes', cheatsheet: 'cheatsheet', questions: 'practice_questions' };
    const blob = new Blob([content], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(session?.topic || 'notes').replace(/\s+/g, '_')}_${suffixes[notesType]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Preparing your completion summary...</p>
      </div>
    );
  }

  const checkpoints = analytics?.checkpoints || [];
  const getScore = (cpData) => {
    if (cpData.scores && cpData.scores.length > 0) return Math.max(...cpData.scores);
    if (cpData.checkpoint?.understanding_score != null) return cpData.checkpoint.understanding_score;
    if (cpData.understanding_score != null) return cpData.understanding_score;
    return 0;
  };

  const avgScore = checkpoints.length > 0
    ? checkpoints.reduce((sum, cp) => sum + getScore(cp), 0) / checkpoints.length
    : 0;

  const totalAttempts = checkpoints.reduce((sum, cp) => sum + (cp.attempts || 0), 0);
  const totalXP = (session?.xp_earned || 0) + 20;   // 20 bonus for completion

  const noteTypes = [
    { value: 'comprehensive', label: '📄 Comprehensive Notes',  desc: 'Full study guide with memory aids, practice Qs & next steps' },
    { value: 'cheatsheet',    label: '📋 Quick Reference',      desc: 'Key concepts only — scannable bullets, no lengthy explanations' },
    { value: 'questions',     label: '❓ Practice Questions',    desc: 'MCQ + short answer Qs per checkpoint, with answer hints' },
  ];

  const currentNotes = notesContent[notesType];
  const isLoadingCurrentNotes = loadingNotes[notesType];

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <BadgePopup badges={newBadges} onClose={() => setNewBadges([])} />

      <div className="card card-elevated fade-in" style={{
        background: 'linear-gradient(135deg, #4392F1 0%, #6BA3F5 100%)',
        color: 'white', textAlign: 'center', padding: '60px 32px',
        marginBottom: '32px', border: 'none',
        boxShadow: '0 10px 40px rgba(67,146,241,0.4)',
      }}>
        <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎉</div>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '44px', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          Congratulations!
        </h1>
        <p style={{ color: '#E3EBFF', margin: '16px 0', fontSize: '22px', fontWeight: '500' }}>
          You've successfully completed your learning journey on
        </p>
        <h2 style={{ color: 'white', margin: '16px 0', fontSize: '30px', fontWeight: '700' }}>
          {session?.topic}
        </h2>
        {totalXP > 0 && (
          <div style={{ marginTop: '28px', padding: '14px 28px', background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius)', display: 'inline-block' }}>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>+{totalXP} XP Earned! 🌟</span>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Includes 20 XP completion bonus</p>
          </div>
        )}
      </div>

      <div className="grid grid-4 fade-in" style={{ marginBottom: '32px', animationDelay: '0.1s' }}>
        {[
          { icon: '📚', value: checkpoints.length, label: 'Checkpoints Mastered', color: 'var(--primary)' },
          { icon: '🎯', value: `${(avgScore * 100).toFixed(1)}%`, label: 'Best Avg Score', color: 'var(--success)' },
          { icon: '🔁', value: totalAttempts, label: 'Total Quiz Attempts', color: 'var(--warning)' },
          { icon: '📅', value: new Date().toLocaleDateString(), label: 'Completed On', color: 'var(--primary)', small: true },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>{s.icon}</div>
            <h3 style={{ fontSize: s.small ? '16px' : '28px', fontWeight: '700', color: s.color, margin: '0' }}>{s.value}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card fade-in" style={{ marginBottom: '32px', animationDelay: '0.2s' }}>
        <h3 style={{ marginBottom: '8px', color: 'var(--primary)' }}>📊 Checkpoint Performance</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
          Click any checkpoint to see objectives, key concepts, and your attempt history
        </p>

        {checkpoints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No checkpoint data available yet.
          </div>
        ) : (
          checkpoints.map((cpData, i) => (
            <CheckpointRow key={cpData.checkpoint?.id || cpData.id || i} cpData={cpData} index={i} />
          ))
        )}
      </div>

      <div className="card fade-in" style={{ marginBottom: '32px', animationDelay: '0.3s' }}>
        <h3 style={{ marginBottom: '6px', color: 'var(--primary)' }}>📝 Download Your Study Notes</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
          Each format is AI-generated specifically for <strong>{session?.topic}</strong> with your weak areas included.
          Switching formats generates a new file tailored to that type.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {noteTypes.map(type => (
            <button
              key={type.value}
              onClick={() => handleNotesTypeChange(type.value)}
              className={`btn ${notesType === type.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: '1', minWidth: '200px', padding: '14px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: '700' }}>{type.label}</span>
              <span style={{ fontSize: '11px', opacity: 0.78, lineHeight: '1.4' }}>{type.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={downloadNotes}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: '160px' }}
            disabled={!currentNotes || isLoadingCurrentNotes}
          >
            {isLoadingCurrentNotes ? '⏳ Generating...' : '📥 Download Notes'}
          </button>
          <button
            onClick={() => setShowPreview(p => !p)}
            className="btn btn-secondary"
            disabled={!currentNotes || isLoadingCurrentNotes}
          >
            👁️ {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          {isLoadingCurrentNotes && (
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Generating {noteTypes.find(t => t.value === notesType)?.label}...
            </span>
          )}
        </div>

        {showPreview && currentNotes && (
          <div style={{
            marginTop: '20px', padding: '20px',
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            maxHeight: '400px', overflow: 'auto',
            border: '1px solid var(--border)', fontSize: '13px', lineHeight: '1.7',
          }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, color: 'var(--text-primary)' }}>
              {currentNotes}
            </pre>
          </div>
        )}
      </div>

      <div className="card fade-in" style={{
        marginBottom: '32px', animationDelay: '0.4s',
        background: 'linear-gradient(to right, rgba(67,146,241,0.08), rgba(107,163,245,0.08))',
        borderLeft: '5px solid var(--primary)',
      }}>
        <h3 style={{ marginBottom: '14px', color: 'var(--primary)' }}>🎯 Next Steps</h3>
        <ul style={{ marginLeft: '22px', color: 'var(--text-secondary)', lineHeight: '2' }}>
          <li>Apply these concepts through real-world projects</li>
          <li>Teach others using the Feynman Technique</li>
          <li>Explore advanced topics related to <strong>{session?.topic}</strong></li>
          <li>Download your notes and review with spaced repetition</li>
          <li>Revisit any weak areas flagged in Analytics</li>
        </ul>
      </div>

      <div className="grid grid-2 fade-in" style={{ animationDelay: '0.5s' }}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ fontSize: '16px', padding: '18px' }}>
          🚀 Start New Journey
        </button>
        <button onClick={() => navigate('/analytics')} className="btn btn-secondary" style={{ fontSize: '16px', padding: '18px' }}>
          📊 View Analytics
        </button>
      </div>
    </div>
  );
};

export default Completion;