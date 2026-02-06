import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, gamificationAPI } from '../services/api';
import ProgressBar from '../components/Progressbar';

const Session = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [contentCache, setContentCache] = useState({});
  const [displayedText, setDisplayedText] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [tutorMode, setTutorMode] = useState('supportive_buddy');
  const typingRef = useRef(null);
  
  
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadSession();
    }
  }, [id]);

  useEffect(() => {
    if (currentCheckpoint && contentCache[currentCheckpoint.id]?.explanation && !isTyping) {
      typeText(contentCache[currentCheckpoint.id].explanation);
    }
  }, [currentCheckpoint, contentCache]);

  
  useEffect(() => {
    if (checkpoints.length > 0) {
      checkCanComplete();
    }
  }, [checkpoints]);

  const typeText = (text) => {
    setIsTyping(true);
    setDisplayedText('');
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);

    typingRef.current = interval;
  };

  const skipTyping = () => {
    if (typingRef.current && currentCheckpoint) {
      clearInterval(typingRef.current);
      setDisplayedText(contentCache[currentCheckpoint.id]?.explanation || '');
      setIsTyping(false);
    }
  };

  const loadSession = async () => {
    try {
      
      const profileRes = await gamificationAPI.getProfile();
      setTutorMode(profileRes.data.tutor_mode || 'supportive_buddy');
      
      const [sessionRes, checkpointsRes] = await Promise.all([
        sessionAPI.getOne(id),
        sessionAPI.getCheckpoints(id)
      ]);
      
      setSession(sessionRes.data);
      
      if (checkpointsRes.data.length === 0) {
        await generateCheckpoints();
      } else {
        setCheckpoints(checkpointsRes.data);
        
        const firstPending = checkpointsRes.data.find(cp => cp.status === 'pending');
        const checkpointToLoad = firstPending || checkpointsRes.data[0];
        
        if (checkpointToLoad) {
          await loadCheckpointContent(checkpointToLoad);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCheckpoints = async () => {
    setGenerating(true);
    try {
      console.log('📚 Generating checkpoints for session', id);
      await sessionAPI.generateCheckpoints(id);
      const checkpointsRes = await sessionAPI.getCheckpoints(id);
      setCheckpoints(checkpointsRes.data);
      
      if (checkpointsRes.data.length > 0) {
        await loadCheckpointContent(checkpointsRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to generate checkpoints:', error);
      alert('Failed to generate checkpoints. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const loadCheckpointContent = async (checkpoint) => {
    setCurrentCheckpoint(checkpoint);
    setDisplayedText('');
    
    if (contentCache[checkpoint.id]) {
      return;
    }

    setLoadingContent(true);
    try {
      const response = await sessionAPI.getCheckpointContent(id, checkpoint.id);
      
      setContentCache(prev => ({
        ...prev,
        [checkpoint.id]: response.data
      }));
      
    } catch (error) {
      console.error('Failed to load checkpoint content:', error);
      alert('Failed to load checkpoint content. Please try again.');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleStartQuiz = () => {
    if (currentCheckpoint) {
      navigate(`/quiz/${id}/${currentCheckpoint.id}`);
    }
  };

  const handleCheckpointClick = (checkpoint) => {
    const checkpointIndex = checkpoints.findIndex(cp => cp.id === checkpoint.id);
    const isLocked = checkpointIndex > 0 && checkpoints[checkpointIndex - 1].status !== 'completed';
    
    if (!isLocked) {
      loadCheckpointContent(checkpoint);
      setSidebarOpen(false);
    }
  };

  const checkCanComplete = async () => {
    try {
      const response = await sessionAPI.getOne(id);
      const checkpointsRes = await sessionAPI.getCheckpoints(id);
      const allCompleted = checkpointsRes.data.every(cp => cp.status === 'completed');
      setCanComplete(allCompleted && response.data.status !== 'completed');
    } catch (error) {
      console.error('Failed to check completion status:', error);
    }
  };

  const handleCompleteSession = async () => {
    try {
      const response = await sessionAPI.completeSession(id);
      alert(`🎉 ${response.data.message}\n\nTotal XP Earned: ${response.data.total_xp_earned}\n${response.data.level_up ? `New Level: ${response.data.new_level}!` : ''}`);
      
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to complete session:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert('Failed to complete session. Please try again.');
      }
    }
  };

  const changeTutorMode = async (newMode) => {
    try {
      await gamificationAPI.updateTutorMode(newMode);
      setTutorMode(newMode);
      alert(`Tutor mode changed to: ${getTutorModeName(newMode)}`);
    } catch (error) {
      console.error('Failed to change tutor mode:', error);
      alert('Failed to change tutor mode. Please try again.');
    }
  };

  const getTutorModeName = (mode) => {
    const modes = {
      'chill_friend': '😎 Chill Friend',
      'strict_mentor': '📚 Strict Mentor',
      'supportive_buddy': '🤗 Supportive Buddy',
      'exam_mode': '🎯 Exam Mode'
    };
    return modes[mode] || mode;
  };

  const extractMnemonics = (text) => {
    if (!text) return [];
    
    const mnemonicPatterns = [
      /(?:remember|mnemonic|acronym|trick|tip|easy way):\s*([^.!?]+[.!?])/gi,
      /(?:think of it as|imagine|visualize):\s*([^.!?]+[.!?])/gi,
      /(?:to help you remember|here's a tip):\s*([^.!?]+[.!?])/gi
    ];

    const mnemonics = [];
    mnemonicPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mnemonics.push(match[1].trim());
      }
    });

    return mnemonics;
  };

  
  const renderFormattedText = (text) => {
    if (!text) return null;

    
    const lines = text.split('\n');
    const elements = [];
    let currentParagraph = [];
    let listItems = [];
    let inList = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('###')) {
        
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} style={{ marginBottom: '16px', lineHeight: '1.8' }}>
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${index}`} style={{ marginLeft: '20px', marginBottom: '16px' }}>
              {listItems}
            </ul>
          );
          listItems = [];
          inList = false;
        }
        
        const headerText = trimmed.replace(/^###\s*/, '').replace(/\*\*/g, '');
        elements.push(
          <h3 key={`h3-${index}`} style={{ 
            color: 'var(--primary)', 
            marginTop: '24px', 
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            {headerText}
          </h3>
        );
      } 
      
      else if (trimmed.startsWith('**') && trimmed.indexOf('**', 2) > 0 && trimmed.indexOf('**', 2) < 50) {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} style={{ marginBottom: '16px', lineHeight: '1.8' }}>
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${index}`} style={{ marginLeft: '20px', marginBottom: '16px' }}>
              {listItems}
            </ul>
          );
          listItems = [];
          inList = false;
        }
        
        const headerMatch = trimmed.match(/^\*\*([^*]+)\*\*/);
        if (headerMatch) {
          elements.push(
            <h4 key={`h4-${index}`} style={{ 
              color: 'var(--primary)', 
              marginTop: '20px', 
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {headerMatch[1]}
            </h4>
          );
        }
      }
      
      else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} style={{ marginBottom: '16px', lineHeight: '1.8' }}>
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        
        const itemText = trimmed.substring(1).trim();
        listItems.push(
          <li key={`li-${index}`} style={{ marginBottom: '8px', lineHeight: '1.6' }}>
            {itemText}
          </li>
        );
        inList = true;
      }
      
      else if (trimmed === '') {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} style={{ marginBottom: '16px', lineHeight: '1.8' }}>
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${index}`} style={{ marginLeft: '20px', marginBottom: '16px' }}>
              {listItems}
            </ul>
          );
          listItems = [];
          inList = false;
        }
      }
      
      else {
        if (inList && listItems.length > 0) {
          elements.push(
            <ul key={`ul-${index}`} style={{ marginLeft: '20px', marginBottom: '16px' }}>
              {listItems}
            </ul>
          );
          listItems = [];
          inList = false;
        }
        currentParagraph.push(trimmed);
      }
    });

    
    if (currentParagraph.length > 0) {
      elements.push(
        <p key="p-final" style={{ marginBottom: '16px', lineHeight: '1.8' }}>
          {currentParagraph.join(' ')}
        </p>
      );
    }
    if (listItems.length > 0) {
      elements.push(
        <ul key="ul-final" style={{ marginLeft: '20px', marginBottom: '16px' }}>
          {listItems}
        </ul>
      );
    }

    return <div>{elements}</div>;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
          <h3>Generating Your Learning Path...</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
            This may take a moment. We're creating personalized checkpoints for you!
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            Session not found
          </p>
        </div>
      </div>
    );
  }

  const currentContent = currentCheckpoint ? contentCache[currentCheckpoint.id] : null;
  const mnemonics = currentContent ? extractMnemonics(currentContent.explanation) : [];
  const completedCount = checkpoints.filter(cp => cp.status === 'completed').length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1001,
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '24px',
            transition: 'all 0.3s ease'
          }}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              backdropFilter: 'blur(2px)'
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="card card-elevated" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white', 
          marginBottom: '24px',
          border: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0' }}>{session.topic}</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Checkpoint {currentCheckpoint?.checkpoint_index + 1 || 1} of {checkpoints.length}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Tutor Mode</div>
              <select 
                value={tutorMode}
                onChange={(e) => changeTutorMode(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '2px solid white',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="chill_friend">😎 Chill Friend</option>
                <option value="strict_mentor">📚 Strict Mentor</option>
                <option value="supportive_buddy">🤗 Supportive Buddy</option>
                <option value="exam_mode">🎯 Exam Mode</option>
              </select>
            </div>
          </div>
        </div>

        <ProgressBar 
          current={completedCount} 
          total={checkpoints.length} 
          label="Overall Progress" 
        />

        {/* Show completion button if all checkpoints done */}
        {canComplete && (
          <div className="card" style={{ 
            marginTop: '24px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            color: 'white',
            textAlign: 'center',
            border: 'none'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>🎉 All Checkpoints Completed!</h3>
            <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>
              Congratulations! You've mastered all the checkpoints. Complete your session to earn bonus XP!
            </p>
            <button 
              onClick={handleCompleteSession}
              className="btn"
              style={{
                background: 'white',
                color: '#11998e',
                fontWeight: '700',
                fontSize: '16px',
                padding: '14px 32px'
              }}
            >
              🏆 Complete Session & Earn Bonus XP
            </button>
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: '24px', 
          marginTop: '24px',
          position: 'relative'
        }}>
          <div
            className="checkpoint-sidebar"
            style={{
              position: 'fixed',
              left: sidebarOpen ? '0' : '-300px',
              top: '0',
              bottom: '0',
              width: '280px',
              background: 'var(--surface)',
              boxShadow: sidebarOpen ? '4px 0 12px rgba(0,0,0,0.1)' : 'none',
              zIndex: 1000,
              transition: 'left 0.3s ease',
              overflowY: 'auto',
              padding: '80px 20px 20px 20px'
            }}
          >
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>📚 Checkpoints</h3>
              <ul className="checkpoint-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {checkpoints.map((cp, idx) => {
                  const isLocked = idx > 0 && checkpoints[idx - 1].status !== 'completed';
                  const isCached = !!contentCache[cp.id];
                  
                  return (
                    <li
                      key={cp.id}
                      className={`checkpoint-item 
                        ${cp.status === 'completed' ? 'completed' : ''} 
                        ${currentCheckpoint?.id === cp.id ? 'current' : ''}
                        ${isLocked ? 'locked' : ''}`}
                      onClick={() => handleCheckpointClick(cp)}
                      style={{ 
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        padding: '12px',
                        marginBottom: '8px',
                        borderRadius: 'var(--radius)',
                        background: currentCheckpoint?.id === cp.id ? 'var(--surface-elevated)' : 'transparent',
                        border: currentCheckpoint?.id === cp.id ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s ease',
                        pointerEvents: isLocked ? 'none' : 'auto'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', flex: 1 }}>
                          {cp.status === 'completed' && '✓ '}
                          {isLocked && '🔒 '}
                          {isCached && !isLocked && cp.status !== 'completed' && '📖 '}
                          {idx + 1}. {cp.topic.substring(0, 25)}
                          {cp.topic.length > 25 && '...'}
                        </span>
                        {cp.understanding_score && (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {Math.round(cp.understanding_score * 100)}%
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div style={{ marginLeft: '0' }}>
            {loadingContent && (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Loading content...</p>
              </div>
            )}

            {!loadingContent && currentCheckpoint && currentContent && (
              <>
                <div className="card fade-in" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <h2 style={{ color: 'var(--primary)', margin: 0 }}>
                      {currentCheckpoint.topic}
                    </h2>
                    {isTyping && (
                      <button 
                        onClick={skipTyping}
                        className="btn btn-secondary btn-icon"
                        title="Skip typing animation"
                      >
                        ⏩
                      </button>
                    )}
                  </div>
                  
                  <div style={{ 
                    background: 'var(--surface-elevated)', 
                    padding: '20px', 
                    borderRadius: 'var(--radius)', 
                    marginBottom: '24px',
                    border: '2px solid var(--border)'
                  }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>🎯 Learning Objectives:</h4>
                    <ul style={{ marginLeft: '20px' }}>
                      {currentCheckpoint.objectives?.map((obj, idx) => (
                        <li key={idx} style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {displayedText && (
                    <div style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                      {renderFormattedText(displayedText)}
                    </div>
                  )}

                  {mnemonics.length > 0 && !isTyping && (
                    <div className="mnemonic-card" style={{ 
                      marginTop: '24px',
                      padding: '16px',
                      background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius)',
                      border: '2px solid var(--primary)'
                    }}>
                      <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>💡 Memory Aids & Tips</h4>
                      {mnemonics.map((mnemonic, idx) => (
                        <p key={idx} style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                          • {mnemonic}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card" style={{ textAlign: 'center' }}>
                  <button 
                    onClick={handleStartQuiz}
                    className="btn btn-primary"
                    style={{ fontSize: '16px', padding: '14px 32px' }}
                    disabled={isTyping || loadingContent}
                  >
                    {isTyping ? 'Please wait...' : '✅ Ready for Quiz'}
                  </button>
                  {isTyping && (
                    <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Reading the lesson...
                    </p>
                  )}
                </div>
              </>
            )}

            {!loadingContent && !currentCheckpoint && (
              <div className="card">
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                  Click the menu button to select a checkpoint
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Session;