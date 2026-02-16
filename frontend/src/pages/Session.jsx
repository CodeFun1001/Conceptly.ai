import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, gamificationAPI } from '../services/api';

const Session = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingCheckpoints, setGeneratingCheckpoints] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    loadSession();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sessionId]);

  useEffect(() => {
    if (checkpoints.length > 0) {
      checkCompletionStatus();
    }
  }, [checkpoints]);

  const loadSession = async () => {
    try {
      const sessionRes = await sessionAPI.getOne(sessionId);
      setSession(sessionRes.data);

      const checkpointsRes = await sessionAPI.getCheckpoints(sessionId);
      
      if (checkpointsRes.data.length === 0) {
        setGeneratingCheckpoints(true);
        const generateRes = await sessionAPI.generateCheckpoints(sessionId);
        const newCheckpointsRes = await sessionAPI.getCheckpoints(sessionId);
        setCheckpoints(newCheckpointsRes.data);
      } else {
        setCheckpoints(checkpointsRes.data);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
      setGeneratingCheckpoints(false);
    }
  };

  const checkCompletionStatus = async () => {
    try {
      const res = await sessionAPI.canCompleteSession(sessionId);
      setCanComplete(res.data.can_complete);
    } catch (error) {
      console.error('Failed to check completion status:', error);
    }
  };

  const handleCheckpointClick = async (checkpoint) => {
    if (checkpoint.status === 'completed') {
      navigate(`/quiz/${sessionId}/${checkpoint.id}`);
      return;
    }

    setCurrentCheckpoint(checkpoint);
    setExplanation('');
    setLoadingExplanation(true);
    
    try {
      const contentRes = await sessionAPI.getCheckpointContent(sessionId, checkpoint.id);
      setExplanation(contentRes.data.explanation);
    } catch (error) {
      console.error('Failed to load checkpoint content:', error);
      setExplanation('Failed to load explanation. Please try again.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleStartQuiz = () => {
    if (currentCheckpoint) {
      navigate(`/quiz/${sessionId}/${currentCheckpoint.id}`);
    }
  };

  const handleCompleteSession = async () => {
    if (!canComplete) return;
    
    setCompleting(true);
    try {
      const res = await sessionAPI.completeSession(sessionId);
      await gamificationAPI.checkBadges();
      
      alert(`🎉 ${res.data.message}\n\nXP Earned: ${res.data.total_xp_earned}\n${res.data.level_up ? `🎊 Level Up! You're now Level ${res.data.new_level}!` : ''}`);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to complete session:', error);
      alert(error.response?.data?.detail || 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  const formatMarkdown = (text) => {
    if (!text) return '';
    
    text = text.replace(/^### (.+)$/gm, '<h3 style="color: var(--primary); margin-top: 24px; margin-bottom: 12px; font-size: 20px;">$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2 style="color: var(--primary); margin-top: 28px; margin-bottom: 14px; font-size: 24px;">$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1 style="color: var(--primary); margin-top: 32px; margin-bottom: 16px; font-size: 28px;">$1</h1>');
    
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--primary); font-weight: 700;">$1</strong>');
    text = text.replace(/^[•\-\*] (.+)$/gm, '<li style="margin-left: 24px; margin-bottom: 8px; line-height: 1.6;">$1</li>');
    text = text.replace(/(<li[^>]*>.*<\/li>\s*)+/g, '<ul style="margin: 16px 0; padding-left: 0;">$&</ul>');
    
    text = text.split('\n\n').map(para => {
      if (para.trim() && !para.includes('<h') && !para.includes('<ul') && !para.includes('<li')) {
        return `<p style="margin-bottom: 16px; line-height: 1.7; color: var(--text-primary);">${para}</p>`;
      }
      return para;
    }).join('\n');
    
    return text;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  if (generatingCheckpoints) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Generating learning checkpoints...</p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          This may take a few moments
        </p>
      </div>
    );
  }

  const completedCount = checkpoints.filter(cp => cp.status === 'completed').length;
  const progressPercentage = checkpoints.length > 0 
    ? (completedCount / checkpoints.length * 100) 
    : 0;

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <div 
        className="card card-elevated fade-in" 
        style={{ 
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          color: 'white',
          marginBottom: '24px',
          border: 'none',
          padding: isMobile ? '20px' : '32px'
        }}
      >
        <h1 style={{ margin: '0 0 12px 0', fontSize: isMobile ? '22px' : '28px' }}>
          {session?.topic}
        </h1>
        <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            padding: '6px 14px', 
            borderRadius: '20px',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: '600'
          }}>
            {completedCount}/{checkpoints.length} Checkpoints
          </span>
          <span style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            padding: '6px 14px', 
            borderRadius: '20px',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: '600',
            textTransform: 'capitalize'
          }}>
            {session?.status}
          </span>
        </div>
        <div className="progress-bar" style={{ height: '10px', background: 'rgba(255, 255, 255, 0.2)' }}>
          <div 
            className="progress-fill" 
            style={{ 
              width: `${progressPercentage}%`,
              background: 'linear-gradient(90deg, #10B981, #059669)'
            }}
          ></div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : currentCheckpoint ? '350px 1fr' : '1fr',
        gap: '24px'
      }}>
        {/* Checkpoints List */}
        <div className="card slide-in" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '20px' : '24px' }}>
            📚 Learning Path
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {checkpoints.map((checkpoint, index) => (
              <div
                key={checkpoint.id}
                onClick={() => handleCheckpointClick(checkpoint)}
                style={{
                  padding: isMobile ? '14px' : '16px',
                  background: currentCheckpoint?.id === checkpoint.id 
                    ? 'var(--surface-elevated)' 
                    : 'var(--background)',
                  border: `2px solid ${currentCheckpoint?.id === checkpoint.id 
                    ? 'var(--primary)' 
                    : checkpoint.status === 'completed' 
                      ? 'var(--success)' 
                      : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                className="fade-in"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: isMobile ? '18px' : '20px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    minWidth: '28px'
                  }}>
                    {index + 1}
                  </span>
                  {checkpoint.status === 'completed' && (
                    <span style={{ fontSize: isMobile ? '16px' : '18px' }}>✅</span>
                  )}
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: isMobile ? '15px' : '16px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    flex: 1
                  }}>
                    {checkpoint.topic}
                  </h3>
                </div>
                <div style={{ 
                  fontSize: isMobile ? '12px' : '13px', 
                  color: 'var(--text-secondary)',
                  marginLeft: isMobile ? '30px' : '40px'
                }}>
                  {checkpoint.objectives?.slice(0, 2).map((obj, idx) => (
                    <div key={idx} style={{ marginBottom: '4px' }}>
                      • {obj}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {canComplete && (
            <button
              onClick={handleCompleteSession}
              disabled={completing}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                marginTop: '20px',
                fontSize: isMobile ? '14px' : '16px',
                padding: isMobile ? '12px' : '14px'
              }}
            >
              {completing ? 'Completing...' : '🎉 Complete Session'}
            </button>
          )}
        </div>

        {/* Explanation Panel */}
        {currentCheckpoint && (
          <div className="card slide-in" style={{ animationDelay: '0.1s' }}>
            <h2 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '20px' : '24px' }}>
              📖 {currentCheckpoint.topic}
            </h2>

            {loadingExplanation ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Preparing explanation...</p>
              </div>
            ) : (
              <>
                <div 
                  style={{ 
                    fontSize: isMobile ? '14px' : '15px',
                    lineHeight: '1.8',
                    color: 'var(--text-primary)',
                    marginBottom: '24px',
                    maxWidth: '100%',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(explanation) }}
                />

                <div style={{ 
                  padding: isMobile ? '16px' : '20px', 
                  background: 'var(--surface-elevated)', 
                  borderRadius: 'var(--radius)',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ marginBottom: '12px', color: 'var(--primary)', fontSize: isMobile ? '16px' : '18px' }}>
                    🎯 Learning Objectives
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {currentCheckpoint.objectives?.map((obj, idx) => (
                      <li key={idx} style={{ 
                        marginBottom: '8px', 
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '13px' : '14px',
                        lineHeight: '1.6'
                      }}>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleStartQuiz}
                  className="btn btn-primary"
                  style={{ 
                    width: '100%',
                    fontSize: isMobile ? '15px' : '16px',
                    padding: isMobile ? '14px' : '16px'
                  }}
                >
                  {currentCheckpoint.status === 'completed' 
                    ? '📝 Review Quiz' 
                    : '🚀 Start Quiz'}
                </button>
              </>
            )}
          </div>
        )}

        {!currentCheckpoint && !isMobile && (
          <div className="card slide-in" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '400px',
            animationDelay: '0.1s'
          }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <p style={{ fontSize: '16px' }}>
                Select a checkpoint from the left to begin learning
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Session;