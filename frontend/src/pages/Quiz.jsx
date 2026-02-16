import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, checkpointAPI } from '../services/api';

const Quiz = () => {
  const { sessionId, checkpointId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkpoint, setCheckpoint] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    loadQuestions();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadQuestions = async () => {
    try {
      const checkpointsRes = await sessionAPI.getCheckpoints(sessionId);
      const currentCheckpoint = checkpointsRes.data.find(cp => cp.id === parseInt(checkpointId));
      setCheckpoint(currentCheckpoint);

      const questionsRes = await sessionAPI.getCheckpointQuestions(sessionId, checkpointId);
      setQuestions(questionsRes.data.questions);
      setAnswers(new Array(questionsRes.data.questions.length).fill(''));
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const unanswered = answers.some(ans => !ans || ans.trim() === '');
    if (unanswered) {
      alert('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const result = await checkpointAPI.submitQuiz(checkpointId, answers);
      
      if (result.data.passed) {
        alert(`✅ Congratulations! You passed with ${(result.data.score * 100).toFixed(0)}%\n\nXP Earned: +${result.data.xp_earned}`);
        await sessionAPI.completeCheckpoint(sessionId, checkpointId);
        navigate(`/session/${sessionId}`);
      } else {
        const retry = window.confirm(
          `You scored ${(result.data.score * 100).toFixed(0)}%\n\n` +
          `Correct: ${result.data.correct_count}/${result.data.total_questions}\n\n` +
          `Would you like a simplified explanation to help you understand better?`
        );
        
        if (retry) {
          navigate(`/feynman/${sessionId}/${checkpointId}`);
        }
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  const answeredCount = answers.filter(ans => ans && ans.trim() !== '').length;
  const progressPercentage = questions.length > 0 
    ? (answeredCount / questions.length * 100) 
    : 0;

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '12px' : '24px' }}>
      <div 
        className="card card-elevated fade-in" 
        style={{ 
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: 'white',
          marginBottom: '24px',
          border: 'none',
          padding: isMobile ? '20px' : '32px'
        }}
      >
        <h1 style={{ margin: '0 0 12px 0', fontSize: isMobile ? '22px' : '28px' }}>
          📝 Quiz: {checkpoint?.topic}
        </h1>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: isMobile ? '13px' : '14px' }}>
            <span>Progress: {answeredCount}/{questions.length} answered</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="progress-bar" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.3)' }}>
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progressPercentage}%`,
                background: 'linear-gradient(90deg, #FBBF24, #F59E0B)'
              }}
            ></div>
          </div>
        </div>
        <p style={{ margin: 0, opacity: 0.95, fontSize: isMobile ? '13px' : '14px' }}>
          Pass threshold: 75% • Questions: {questions.length}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {questions.map((question, index) => (
          <div 
            key={index} 
            className="card fade-in" 
            style={{ 
              marginBottom: '24px',
              animationDelay: `${index * 0.05}s`,
              padding: isMobile ? '20px' : '24px'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              marginBottom: '16px',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
              <span style={{ 
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: '700',
                color: 'var(--primary)',
                background: 'var(--surface-elevated)',
                padding: '8px 14px',
                borderRadius: '50%',
                minWidth: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {index + 1}
              </span>
              <h3 style={{ 
                margin: 0, 
                fontSize: isMobile ? '15px' : '16px',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                flex: 1,
                wordWrap: 'break-word'
              }}>
                {question.question}
              </h3>
            </div>

            {question.tested_concept && (
              <div style={{ 
                marginBottom: '16px',
                padding: '8px 12px',
                background: 'var(--surface-elevated)',
                borderRadius: 'var(--radius)',
                fontSize: isMobile ? '12px' : '13px',
                color: 'var(--text-secondary)',
                display: 'inline-block'
              }}>
                🎯 Testing: {question.tested_concept}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {question.options.map((option, optIndex) => (
                <label 
                  key={optIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: isMobile ? '14px' : '16px',
                    background: answers[index] === option 
                      ? 'var(--surface-elevated)' 
                      : 'var(--background)',
                    border: `2px solid ${answers[index] === option 
                      ? 'var(--primary)' 
                      : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: isMobile ? '14px' : '15px',
                    lineHeight: '1.5',
                    wordWrap: 'break-word'
                  }}
                  onMouseEnter={(e) => {
                    if (answers[index] !== option) {
                      e.currentTarget.style.background = 'var(--surface-elevated)';
                      e.currentTarget.style.borderColor = 'var(--text-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (answers[index] !== option) {
                      e.currentTarget.style.background = 'var(--background)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    checked={answers[index] === option}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    style={{ 
                      marginTop: '4px',
                      cursor: 'pointer',
                      minWidth: '18px',
                      minHeight: '18px'
                    }}
                  />
                  <span style={{ flex: 1, color: 'var(--text-primary)' }}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="card" style={{ padding: isMobile ? '20px' : '24px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <button
              type="button"
              onClick={() => navigate(`/session/${sessionId}`)}
              className="btn btn-secondary"
              style={{ 
                flex: isMobile ? 'none' : 1,
                fontSize: isMobile ? '14px' : '16px',
                padding: isMobile ? '12px' : '14px'
              }}
            >
              ← Back to Session
            </button>
            <button
              type="submit"
              disabled={submitting || answeredCount < questions.length}
              className="btn btn-primary"
              style={{ 
                flex: isMobile ? 'none' : 2,
                fontSize: isMobile ? '14px' : '16px',
                padding: isMobile ? '12px' : '14px'
              }}
            >
              {submitting ? 'Submitting...' : `Submit Quiz (${answeredCount}/${questions.length})`}
            </button>
          </div>
          
          {answeredCount < questions.length && (
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--warning)', 
              marginTop: '16px',
              marginBottom: 0,
              fontSize: isMobile ? '13px' : '14px'
            }}>
              ⚠️ Please answer all questions before submitting
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default Quiz;