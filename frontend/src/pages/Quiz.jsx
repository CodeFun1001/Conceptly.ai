import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, checkpointAPI } from '../services/api';

const triggerConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    for (let i = 0; i < particleCount; i++) {
      createConfettiParticle(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight / 3
      );
    }
  }, 250);
};

const createConfettiParticle = (x, y) => {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    background: ${['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)]};
    left: ${x}px;
    top: ${y}px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 10000;
    animation: confetti-fall ${2 + Math.random() * 2}s ease-out forwards;
  `;
  
  document.body.appendChild(particle);
  
  setTimeout(() => {
    particle.remove();
  }, 4000);
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confetti-fall {
      to {
        transform: translateY(${window.innerHeight}px) rotate(${360 * 2}deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

const Quiz = () => {
  const { sessionId, checkpointId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (result && result.passed) {
      triggerConfetti();
    }
  }, [result]);

  const loadQuestions = async () => {
    try {
      const response = await sessionAPI.getCheckpointQuestions(sessionId, checkpointId);
      setQuestions(response.data.questions);
      setAnswers(new Array(response.data.questions.length).fill(''));
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (answers.some(a => !a)) {
      alert('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const response = await checkpointAPI.submitQuiz(checkpointId, answers);
      setResult(response.data);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeynman = () => {
    navigate(`/feynman/${sessionId}/${checkpointId}`);
  };

  const handleContinue = () => {
    navigate(`/session/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (result) {
    const passed = result.passed;
    const percentage = (result.score * 100).toFixed(0);

    return (
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div 
          className="card card-elevated fade-in" 
          style={{ 
            background: passed 
              ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' 
              : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '48px 32px',
            marginBottom: '24px',
            border: 'none'
          }}
        >
          <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'bounce 1s ease' }}>
            {passed ? '🎉' : '📚'}
          </div>
          <h1 style={{ margin: '0 0 16px 0' }}>
            {passed ? 'Checkpoint Passed!' : 'Keep Learning!'}
          </h1>
          <p style={{ fontSize: '56px', fontWeight: '800', margin: '16px 0' }}>
            {percentage}%
          </p>
          <p style={{ margin: 0, fontSize: '20px', opacity: 0.95 }}>
            {result.correct_count}/{result.total_questions} Correct
          </p>
          {result.xp_earned > 0 && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px 24px', 
              background: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 'var(--radius)',
              display: 'inline-block'
            }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>+{result.xp_earned} XP Earned! 🌟</span>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>📋 Detailed Results</h3>
          {result.detailed_results.map((detail, idx) => (
            <div 
              key={idx}
              className="quiz-question fade-in"
              style={{ 
                borderLeftColor: detail.is_correct ? 'var(--success)' : 'var(--error)',
                background: detail.is_correct ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                marginBottom: '20px',
                animationDelay: `${idx * 0.1}s`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Question {idx + 1}</h4>
                <span style={{ fontSize: '28px' }}>
                  {detail.is_correct ? '✅' : '❌'}
                </span>
              </div>
              
              <p style={{ marginBottom: '16px', fontWeight: '500', fontSize: '16px' }}>
                {detail.question}
              </p>
              
              <div style={{ 
                background: 'var(--surface)', 
                borderRadius: 'var(--radius)', 
                padding: '16px', 
                marginBottom: '12px',
                border: '2px solid var(--border)'
              }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Your Answer:</strong>
                <div style={{ 
                  background: detail.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '8px',
                  color: detail.is_correct ? 'var(--success)' : 'var(--error)',
                  fontWeight: '600'
                }}>
                  {detail.user_answer}
                </div>
              </div>
              
              {!detail.is_correct && (
                <div style={{ 
                  background: 'var(--surface)', 
                  borderRadius: 'var(--radius)', 
                  padding: '16px', 
                  marginBottom: '12px',
                  border: '2px solid var(--border)'
                }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Correct Answer:</strong>
                  <div style={{ 
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '8px',
                    color: 'var(--success)',
                    fontWeight: '600'
                  }}>
                    {detail.correct_answer}
                  </div>
                </div>
              )}
              
              <div style={{ 
                background: 'var(--surface-elevated)', 
                borderRadius: 'var(--radius)', 
                padding: '16px',
                border: '1px solid var(--border)'
              }}>
                <strong>💡 Explanation:</strong>
                <p style={{ marginTop: '8px', marginBottom: 0, color: 'var(--text-secondary)' }}>
                  {detail.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          {passed ? (
            <button 
              onClick={handleContinue}
              className="btn btn-primary"
              style={{ fontSize: '16px', padding: '16px 40px' }}
            >
              ➡️ Continue to Next Checkpoint
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleFeynman}
                className="btn btn-primary"
                style={{ fontSize: '16px', padding: '16px 32px' }}
              >
                💡 Get Simplified Explanation
              </button>
              <button 
                onClick={() => navigate(`/session/${sessionId}`)}
                className="btn btn-secondary"
                style={{ fontSize: '16px', padding: '16px 32px' }}
              >
                📖 Review Content
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = answers.filter(a => a).length;

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card card-elevated" style={{ 
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', 
        color: 'white', 
        marginBottom: '24px',
        border: 'none'
      }}>
        <h1 style={{ margin: '0 0 8px 0' }}>🎯 Knowledge Check</h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
          Test your understanding of the concepts you've learned
        </p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {answeredCount}/{questions.length} answered
            </span>
            <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '18px' }}>
              {Math.round((answeredCount / questions.length) * 100)}%
            </span>
          </div>
        </div>
        <div className="progress-bar" style={{ height: '8px', borderRadius: '4px' }}>
          <div 
            className="progress-fill" 
            style={{ 
              width: `${(answeredCount / questions.length) * 100}%`,
              transition: 'width 0.3s ease'
            }}
          ></div>
        </div>
      </div>

      <div className="quiz-question" style={{ minHeight: '400px' }}>
        <p style={{ 
          fontSize: '20px', 
          lineHeight: '1.7', 
          marginBottom: '32px', 
          fontWeight: '500',
          color: 'var(--text-primary)'
        }}>
          {question.question}
        </p>

        <div className="quiz-options">
          {question.options.map((option, idx) => {
            const isSelected = answers[currentQuestion] === option;
            return (
              <div
                key={idx}
                className={`quiz-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(option)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'translateX(4px)' : 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isSelected && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'white'
                      }}></div>
                    )}
                  </div>
                  <span style={{ 
                    flex: 1, 
                    fontSize: '16px',
                    fontWeight: isSelected ? '600' : '400'
                  }}>
                    {option}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px',
        marginTop: '24px'
      }}>
        <button 
          onClick={handlePrevious}
          className="btn btn-secondary"
          disabled={currentQuestion === 0}
          style={{ minWidth: '120px', opacity: currentQuestion === 0 ? 0.5 : 1 }}
        >
          ⬅️ Previous
        </button>

        <div style={{ textAlign: 'center' }}>
          {answers[currentQuestion] ? (
            <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '16px' }}>
              ✅ Answered
            </span>
          ) : (
            <span style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>
              Select an answer
            </span>
          )}
        </div>

        {currentQuestion < questions.length - 1 ? (
          <button 
            onClick={handleNext}
            className="btn btn-primary"
            style={{ minWidth: '120px' }}
          >
            Next ➡️
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={submitting || answeredCount < questions.length}
            style={{ 
              minWidth: '150px',
              opacity: (submitting || answeredCount < questions.length) ? 0.6 : 1
            }}
          >
            {submitting ? 'Submitting...' : '📊 Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Quiz;