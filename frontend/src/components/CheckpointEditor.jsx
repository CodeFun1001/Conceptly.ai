
import { useState } from 'react';
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8000'
    : window.location.origin + '/api');

const C = {
  primary:  '#6366F1',
  success:  '#10B981',
  error:    '#EF4444',
  warning:  '#F59E0B',
  border:   'var(--border)',
  text:     'var(--text-primary)',
  textSec:  'var(--text-secondary)',
  surface:  'var(--surface)',
};

const TagInput = ({ items, onChange, placeholder }) => {
  const [input, setInput] = useState('');

  const addItem = () => {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInput('');
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '13px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
              color: C.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {item}
            <button
              onClick={() => removeItem(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.primary, fontSize: '14px', lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addItem(); }
          }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '8px',
            border: `1.5px solid ${C.border}`, background: 'var(--background)',
            color: C.text, fontSize: '13px', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={addItem}
          style={{
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: C.primary, color: 'white', fontWeight: '700',
            cursor: 'pointer', fontSize: '13px',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
};

const CheckpointEditor = ({ checkpoint, sessionId, onSave, onCancel }) => {
  const [topic, setTopic]           = useState(checkpoint.topic || '');
  const [objectives, setObjectives] = useState(checkpoint.objectives || []);
  const [keyConcepts, setKeyConcepts] = useState(checkpoint.key_concepts || []);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSave = async () => {
    if (!topic.trim()) { setError('Topic cannot be empty.'); return; }
    if (objectives.length === 0) { setError('Add at least one objective.'); return; }
    setError('');
    setSaving(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.put(
        `${API_URL}/sessions/${sessionId}/checkpoints/${checkpoint.id}`,
        { topic: topic.trim(), objectives, key_concepts: keyConcepts },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onSave) onSave({ ...checkpoint, topic: topic.trim(), objectives, key_concepts: keyConcepts });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        border: `2px solid ${C.primary}`,
        borderRadius: '14px',
        padding: '20px',
        background: 'rgba(99,102,241,0.04)',
        marginBottom: '16px',
      }}
    >
      <h4 style={{ margin: '0 0 18px 0', color: C.primary, fontSize: '16px' }}>
        ✏️ Edit Checkpoint
      </h4>

      {/* Topic */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', marginBottom: '6px', color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Topic
        </label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            border: `1.5px solid ${C.border}`, background: 'var(--background)',
            color: C.text, fontSize: '15px', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', marginBottom: '6px', color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Learning Objectives
        </label>
        <TagInput
          items={objectives}
          onChange={setObjectives}
          placeholder="Type an objective and press Enter…"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', marginBottom: '6px', color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Key Concepts
        </label>
        <TagInput
          items={keyConcepts}
          onChange={setKeyConcepts}
          placeholder="Type a concept and press Enter…"
        />
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: C.error, fontWeight: '600', marginBottom: '16px',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px',
            border: `1.5px solid ${C.border}`, background: 'none',
            color: C.textSec, fontWeight: '600', cursor: 'pointer', fontSize: '14px',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
            background: C.primary, color: 'white', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '💾 Saving…' : '✅ Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default CheckpointEditor;