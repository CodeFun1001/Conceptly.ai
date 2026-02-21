import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkpointAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Feynman = () => {
  const { sessionId, checkpointId } = useParams();
  const navigate = useNavigate();
  const [explanation, setExplanation] = useState('');
  const [weakAreas, setWeakAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    loadFeynmanExplanation();
  }, [attempt]);

  const loadFeynmanExplanation = async () => {
    setLoading(true);
    try {
      const response = await checkpointAPI.getFeynman(checkpointId, attempt);
      setExplanation(response.data.explanation);
      setWeakAreas(response.data.weak_areas);
    } catch (error) {
      console.error('Failed to load Feynman explanation:', error);
    } finally {
      setLoading(false);
    }
  };

  const markdownComponents = {
    h1: ({ children }) => <h1 style={{ color: 'var(--primary)', marginTop: '24px', marginBottom: '12px', fontSize: '20px', fontWeight: '700' }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ color: 'var(--primary)', marginTop: '20px', marginBottom: '10px', fontSize: '18px', fontWeight: '700' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ color: 'var(--primary)', marginTop: '18px', marginBottom: '8px', fontSize: '16px', fontWeight: '700' }}>{children}</h3>,
    h4: ({ children }) => <h4 style={{ color: 'var(--primary)', marginTop: '14px', marginBottom: '6px', fontSize: '15px', fontWeight: '600' }}>{children}</h4>,
    p: ({ children }) => <p style={{ marginBottom: '16px', lineHeight: '1.8', color: 'var(--text-primary)' }}>{children}</p>,
    ul: ({ children }) => <ul style={{ marginLeft: '24px', marginBottom: '16px', lineHeight: '1.7' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ marginLeft: '24px', marginBottom: '16px', lineHeight: '1.7' }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: '6px', color: 'var(--text-primary)' }}>{children}</li>,
    strong: ({ children }) => <strong style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: 'var(--text-secondary)' }}>{children}</em>,
    blockquote: ({ children }) => <blockquote style={{ borderLeft: '4px solid var(--primary)', paddingLeft: '16px', margin: '16px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{children}</blockquote>,
  };

  const handleTryAgainWeakTopics = () => {
    // Navigate to quiz with weak areas as query params so the quiz can generate targeted questions
    const weakAreasParam = encodeURIComponent(JSON.stringify(weakAreas));
    navigate(`/quiz/${sessionId}/${checkpointId}?weakAreas=${weakAreasParam}&retryMode=true`);
  };

  const handleDifferentApproach = () => {
    setAttempt(attempt + 1);
  };

  const handleBackToSession = () => {
    navigate(`/session/${sessionId}`);
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
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div 
        className="card card-elevated fade-in" 
        style={{ 
          background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
          color: 'white',
          marginBottom: '24px',
          border: 'none'
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>💡</div>
        <h1 style={{ margin: '0 0 12px 0' }}>Simplified Explanation</h1>
        <p style={{ margin: 0, opacity: 0.95, fontSize: '16px' }}>
          Let's break this down in a simpler way
        </p>
      </div>

      {weakAreas.length > 0 && (
        <div className="card fade-in" style={{ 
          marginBottom: '24px',
          animationDelay: '0.1s',
          background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.1))',
          borderLeft: '4px solid var(--primary)'
        }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>📚 Focus Areas</h3>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
            We'll pay special attention to these concepts:
          </p>
          <ul style={{ marginBottom: 0, paddingLeft: '24px' }}>
            {weakAreas.map((area, idx) => (
              <li key={idx} style={{ 
                marginBottom: '8px', 
                color: 'var(--text-primary)',
                fontSize: '15px'
              }}>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card fade-in" style={{ 
        marginBottom: '24px',
        animationDelay: '0.2s'
      }}>
        <div style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--text-primary)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {explanation}
          </ReactMarkdown>
        </div>
      </div>

      <div className="card fade-in" style={{ 
        animationDelay: '0.3s'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>
          What would you like to do next?
        </h3>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px'
        }}>
          {weakAreas.length > 0 && (
            <button 
              onClick={handleTryAgainWeakTopics}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                fontSize: '16px', 
                padding: '16px',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                border: 'none'
              }}
            >
              🎯 Try Again — New Questions on Weak Topics
            </button>
          )}

          <button 
            onClick={() => navigate(`/quiz/${sessionId}/${checkpointId}`)}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              fontSize: '16px', 
              padding: '16px',
              justifyContent: 'center'
            }}
          >
            🔁 Retry Full Quiz
          </button>
          
          <button 
            onClick={handleDifferentApproach}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              fontSize: '16px', 
              padding: '16px',
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
              fontSize: '16px', 
              padding: '16px',
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
        borderLeft: '4px solid var(--primary)'
      }}>
        <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>
          💭 Learning Tip
        </h4>
        <p style={{ 
          margin: 0, 
          color: 'var(--text-secondary)',
          fontSize: '15px',
          lineHeight: '1.6'
        }}>
          The Feynman Technique is about explaining concepts in simple terms. 
          If you can explain it simply, you truly understand it. Take your time 
          to absorb this explanation, and when you're ready, try the quiz again!
        </p>
      </div>
    </div>
  );
};

export default Feynman;