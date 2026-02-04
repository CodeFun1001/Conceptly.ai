import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import SessionCard from '../components/SessionCard';

const History = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await analyticsAPI.getHistory();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading history...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
        <Sidebar />
        
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: '0 0 8px 0' }}>📚 Learning History</h1>
            <p style={{ color: '#666', margin: 0 }}>
              Your complete learning journey
            </p>
          </div>

          {sessions.length > 0 ? (
            <div>
              {sessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
              <h3 style={{ color: '#666' }}>No sessions yet</h3>
              <p style={{ color: '#999' }}>Start your first learning journey to see your history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;