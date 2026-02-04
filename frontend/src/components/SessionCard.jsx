import { useNavigate } from 'react-router-dom';

const SessionCard = ({ session }) => {
  const navigate = useNavigate();

  const statusColors = {
    in_progress: '#FF9800',
    completed: '#4CAF50',
    pending: '#999'
  };

  return (
    <div 
      className="card" 
      style={{ cursor: 'pointer', borderLeft: `5px solid ${statusColors[session.status]}` }}
      onClick={() => navigate(`/session/${session.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h3 style={{ color: '#262626', marginBottom: '8px' }}>{session.topic}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Started: {new Date(session.created_at).toLocaleDateString()}
          </p>
          {session.completed_at && (
            <p style={{ color: '#666', fontSize: '14px' }}>
              Completed: {new Date(session.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div>
          <span 
            className="badge" 
            style={{ 
              background: statusColors[session.status], 
              color: 'white' 
            }}
          >
            {session.status.replace('_', ' ').toUpperCase()}
          </span>
          {session.xp_earned > 0 && (
            <span style={{ marginLeft: '8px', color: '#FFD700', fontWeight: '700' }}>
              +{session.xp_earned} XP
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionCard;