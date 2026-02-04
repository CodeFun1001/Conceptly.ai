import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, analyticsAPI, gamificationAPI } from '../services/api';
import confetti from 'canvas-confetti';

const Completion = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [notes, setNotes] = useState('');
  const [notesType, setNotesType] = useState('comprehensive');
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCompletionData();
    triggerCelebration();
  }, []);

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
    }, 250);
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  };

  const loadCompletionData = async () => {
    try {
      const [sessionRes, analyticsRes] = await Promise.all([
        sessionAPI.getOne(sessionId),
        analyticsAPI.getSessionDetails(sessionId)
      ]);
      
      setSession(sessionRes.data);
      setAnalytics(analyticsRes.data);
      
      await sessionAPI.completeSession(sessionId);
      
      const notesRes = await gamificationAPI.generateSmartNotes(sessionId);
      setNotes(notesRes.data.content);
    } catch (error) {
      console.error('Failed to load completion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadNotes = () => {
    const blob = new Blob([notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.topic.replace(/\s+/g, '_')}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Preparing your completion summary...</p>
      </div>
    );
  }

  const checkpoints = analytics?.checkpoints || [];
  const avgScore = checkpoints.length > 0 
    ? checkpoints.reduce((sum, cp) => sum + (cp.understanding_score || 0) * 100, 0) / checkpoints.length 
    : 0;

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div 
        className="card card-elevated fade-in" 
        style={{ 
          background: 'linear-gradient(135deg, #4392F1 0%, #6BA3F5 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '60px 32px',
          marginBottom: '32px',
          border: 'none',
          boxShadow: '0 10px 40px rgba(67, 146, 241, 0.4)'
        }}
      >
        <div style={{ fontSize: '80px', marginBottom: '24px' }}>🎉</div>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '48px', 
          fontWeight: '800',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Congratulations!
        </h1>
        <p style={{ 
          color: '#E3EBFF', 
          margin: '16px 0', 
          fontSize: '24px', 
          fontWeight: '500' 
        }}>
          You've successfully completed your learning journey on
        </p>
        <h2 style={{ 
          color: 'white', 
          margin: '16px 0', 
          fontSize: '32px',
          fontWeight: '700'
        }}>
          {session?.topic}
        </h2>
        <div style={{
          marginTop: '32px',
          padding: '16px 32px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 'var(--radius)',
          display: 'inline-block'
        }}>
          <span style={{ fontSize: '20px', fontWeight: '700' }}>
            +120 XP Earned! 🌟
          </span>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            20 XP bonus for completing the topic!
          </p>
        </div>
      </div>

      <div className="grid grid-4 fade-in" style={{ marginBottom: '32px', animationDelay: '0.1s' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
          <h3 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)', margin: '0' }}>
            {checkpoints.length}
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Checkpoints Mastered
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          <h3 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)', margin: '0' }}>
            {avgScore.toFixed(1)}%
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Average Score
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
          <h3 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--warning)', margin: '0' }}>
            120
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Total XP Earned
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', margin: '0' }}>
            {new Date().toLocaleDateString()}
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Completed On
          </p>
        </div>
      </div>

      <div className="card fade-in" style={{ marginBottom: '32px', animationDelay: '0.2s' }}>
        <h3 style={{ marginBottom: '24px', color: 'var(--primary)' }}>
          📊 Your Learning Progress
        </h3>
        
        {checkpoints.map((checkpoint, idx) => (
          <div 
            key={checkpoint.id}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              marginBottom: '16px',
              borderLeft: `5px solid ${checkpoint.understanding_score >= 0.9 ? '#4CAF50' : checkpoint.understanding_score >= 0.7 ? '#FF9800' : '#F44336'}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                ✅ Checkpoint {idx + 1}: {checkpoint.topic}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ 
                  fontSize: '20px', 
                  fontWeight: '700',
                  color: checkpoint.understanding_score >= 0.9 ? '#4CAF50' : checkpoint.understanding_score >= 0.7 ? '#FF9800' : '#F44336'
                }}>
                  {(checkpoint.understanding_score * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: '24px' }}>
                  {checkpoint.understanding_score >= 0.9 ? '🌟' : checkpoint.understanding_score >= 0.7 ? '👍' : '📖'}
                </span>
              </div>
            </div>
            <p style={{ 
              color: 'var(--text-secondary)', 
              margin: '0',
              fontSize: '14px' 
            }}>
              Attempts: {checkpoint.attempts} • +{checkpoint.xp_earned || 0} XP
            </p>
          </div>
        ))}
      </div>

      <div className="card fade-in" style={{ marginBottom: '32px', animationDelay: '0.3s' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>
          📝 Download Your Study Notes
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Select notes format:
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { value: 'comprehensive', label: '📄 Comprehensive Notes', desc: 'Detailed study guide' },
              { value: 'cheatsheet', label: '📋 Quick Reference', desc: 'Key concepts only' },
              { value: 'questions', label: '❓ Practice Questions', desc: 'Test yourself' }
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setNotesType(type.value)}
                className={`btn ${notesType === type.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  flex: '1',
                  minWidth: '200px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  {type.label}
                </span>
                <span style={{ fontSize: '13px', opacity: 0.8 }}>
                  {type.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={downloadNotes}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            📥 Download Notes
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary"
          >
            👁️ {showPreview ? 'Hide' : 'Preview'}
          </button>
        </div>

        {showPreview && (
          <div style={{
            marginTop: '20px',
            padding: '24px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            maxHeight: '400px',
            overflow: 'auto',
            border: '1px solid var(--border)'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              {notes}
            </pre>
          </div>
        )}
      </div>

      <div className="card fade-in" style={{ 
        marginBottom: '32px', 
        animationDelay: '0.4s',
        background: 'linear-gradient(to right, rgba(67, 146, 241, 0.1), rgba(107, 163, 245, 0.1))',
        borderLeft: '5px solid var(--primary)'
      }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>
          🎯 Next Steps & Recommendations
        </h3>
        <ul style={{ 
          marginLeft: '24px', 
          color: 'var(--text-secondary)',
          lineHeight: '1.8'
        }}>
          <li>Apply these concepts through real-world projects</li>
          <li>Teach others using the Feynman Technique</li>
          <li>Explore advanced topics related to {session?.topic}</li>
          <li>Join online communities and forums</li>
          <li>Practice with the generated questions regularly</li>
          <li>Review your weak areas (if any) periodically</li>
        </ul>
      </div>

      <div className="grid grid-2 fade-in" style={{ animationDelay: '0.5s' }}>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary"
          style={{ fontSize: '16px', padding: '20px' }}
        >
          🎯 Start New Learning Journey
        </button>
        <button 
          onClick={() => navigate('/analytics')}
          className="btn btn-secondary"
          style={{ fontSize: '16px', padding: '20px' }}
        >
          📊 View Full Analytics
        </button>
      </div>
    </div>
  );
};

export default Completion;