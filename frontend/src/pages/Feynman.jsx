import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkpointAPI } from '../services/api';

const Feynman = () => {
  const { sessionId, checkpointId } = useParams();
  const navigate = useNavigate();
  const [explanation, setExplanation] = useState('');
  const [weakAreas, setWeakAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [generatingRetry, setGeneratingRetry] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    loadFeynmanExplanation();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [attempt]);

  const loadFeynmanExplanation = async () => {
    setLoading(true);
    try {
      const response = await checkpointAPI.getFeynman(checkpointId, attempt);
      setExplanation(response.data.explanation);
      setWeakAreas(response.data.weak_areas);
    } catch (error) {
      console.error('Failed to load Feynman explanation:', error);
      setExplanation('Failed to load explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryQuiz = async () => {
    setGeneratingRetry(true);
    try {
      // Generate new quiz based on weak areas
      await checkpointAPI.retryQuiz(checkpointId);
      navigate(`/quiz/${sessionId}/${checkpointId}`);
    } catch (error) {
      console.error('Failed to generate retry quiz:', error);
      // Fallback to regular quiz
      navigate(`/quiz/${sessionId}/${checkpointId}`);
    } finally {
      setGeneratingRetry(false);
    }
  };

  const handleDifferentApproach = () => {
    setAttempt(attempt + 1);
  };

  const handleBackToSession = () => {
    navigate(`/session/${sessionId}`);
  };

  const formatMarkdown = (text) => {
    if (!text) return '';
    
    text = text.replace(/^### (.+)$/gm, '<h3 style="color: var(--primary); margin-top: 24px; margin-bottom: 12px; font-size: ' + (isMobile ? '18px' : '20px') + ';">$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2 style="color: var(--primary); margin-top: 28px; margin-bottom: 14px; font-size: ' + (isMobile ? '20px' : '24px') + ';">$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1 style="color: var(--primary); margin-top: 32px; margin-bottom: 16px; font-size: ' + (isMobile ? '24px' : '28px') + ';">$1</h1>');
    
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
        <p>Creating simplified explanation...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '12px' : '24px' }}>
      <div 
        className="card card-elevated fade-in" 
        style={{ 
          background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
          color: 'white',
          marginBottom: '24px',
          border: 'none',
          padding: isMobile ? '20px' : '32px'
        }}
      >
        <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '16px' }}>💡</div>
        <h1 style={{ margin: '0 0 12px 0', fontSize: isMobile ? '22px' : '28px' }}>Simplified Explanation</h1>
        <p style={{ margin: 0, opacity: 0.95, fontSize: isMobile ? '14px' : '16px' }}>
          Let's break this down in a simpler way
        </p>
        {attempt > 0 && (
          <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: isMobile ? '13px' : '14px' }}>
            Attempt {attempt + 1} - Using a different teaching approach
          </p>
        )}
      </div>

      {weakAreas.length > 0 && (
        <div className="card fade-in" style={{ 
          marginBottom: '24px',
          animationDelay: '0.1s',
          background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.1))',
          borderLeft: '4px solid var(--primary)',
          padding: isMobile ? '16px' : '20px'
        }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: isMobile ? '16px' : '18px' }}>
            📚 Focus Areas
          </h3>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: isMobile ? '13px' : '14px' }}>
            We'll pay special attention to these concepts:
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: isMobile ? '20px' : '24px' }}>
            {weakAreas.map((area, idx) => (
              <li key={idx} style={{ 
                marginBottom: '8px', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '14px' : '15px',
                lineHeight: '1.6'
              }}>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card fade-in" style={{ 
        marginBottom: '24px',
        animationDelay: '0.2s',
        padding: isMobile ? '20px' : '24px'
      }}>
        <div 
          style={{ 
            fontSize: isMobile ? '14px' : '15px',
            lineHeight: '1.8',
            color: 'var(--text-primary)',
            maxWidth: '100%',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
          dangerouslySetInnerHTML={{ __html: formatMarkdown(explanation) }}
        />
      </div>

      <div className="card fade-in" style={{ 
        animationDelay: '0.3s',
        padding: isMobile ? '20px' : '24px'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--primary)', fontSize: isMobile ? '18px' : '20px' }}>
          What would you like to do next?
        </h3>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px'
        }}>
          <button 
            onClick={handleRetryQuiz}
            disabled={generatingRetry}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              fontSize: isMobile ? '14px' : '16px',
              padding: isMobile ? '14px' : '16px',
              justifyContent: 'center'
            }}
          >
            {generatingRetry ? '⏳ Preparing Quiz...' : '🎯 Try Quiz Again (Focused on Weak Areas)'}
          </button>
          
          <button 
            onClick={handleDifferentApproach}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              fontSize: isMobile ? '14px' : '16px',
              padding: isMobile ? '14px' : '16px',
              justifyContent: 'center'
            }}
          >
            🔄 Explain in a Different Way (Attempt {attempt + 2})
          </button>
          
          <button 
            onClick={handleBackToSession}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              fontSize: isMobile ? '14px' : '16px',
              padding: isMobile ? '14px' : '16px',
              justifyContent: 'center'
            }}
          >
            📖 Back to Session
          </button>
        </div>
      </div>

      <div className="card fade-in" style={{ 
        marginTop: '24px',
        animationDelay: '0.4s',
        background: 'rgba(139, 92, 246, 0.05)',
        borderLeft: '4px solid var(--primary)',
        padding: isMobile ? '16px' : '20px'
      }}>
        <h4 style={{ marginBottom: '12px', color: 'var(--primary)', fontSize: isMobile ? '16px' : '18px' }}>
          💭 Learning Tip
        </h4>
        <p style={{ 
          margin: 0, 
          color: 'var(--text-secondary)',
          fontSize: isMobile ? '13px' : '15px',
          lineHeight: '1.6'
        }}>
          The Feynman Technique is about explaining concepts in simple terms. 
          If you can explain it simply, you truly understand it. Take your time 
          to absorb this explanation, and when you're ready, try the quiz again! 
          The new quiz will focus specifically on the areas where you struggled.
        </p>
      </div>
    </div>
  );
};

export default Feynman;