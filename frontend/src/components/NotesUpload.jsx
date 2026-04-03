import { useState, useRef } from 'react';
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8000'
    : window.location.origin + '/api');

const NotesUpload = ({ sessionId, onClose, onSuccess }) => {
  const [tab, setTab] = useState('text');          
  const [notesText, setNotesText] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  
  const handleUpload = async () => {
    setError('');
    if (tab === 'text' && !notesText.trim()) {
      setError('Please paste some notes first.');
      return;
    }
    if (tab === 'file' && !file) {
      setError('Please select a file.');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();

      if (tab === 'text') {
        formData.append('notes_text', notesText.trim());
      } else {
        formData.append('file', file);
      }

      const res = await axios.post(
        `${API_URL}/sessions/${sessionId}/notes/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setResult(res.data);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Upload failed. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  
  const C = {
    primary: '#6366F1',
    success: '#10B981',
    error: '#EF4444',
    border: 'var(--border)',
    surface: 'var(--surface)',
    text: 'var(--text-primary)',
    textSec: 'var(--text-secondary)',
  };

  const overlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  };

  const modal = {
    background: 'var(--surface)',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '560px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    position: 'relative',
  };

  
  if (result) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: C.success, marginBottom: '8px' }}>Notes Uploaded!</h2>
            <p style={{ color: C.textSec, fontSize: '15px', marginBottom: '20px' }}>
              {result.characters.toLocaleString()} characters processed
            </p>
            {result.rag_active && (
              <div
                style={{
                  padding: '12px 20px', borderRadius: '12px',
                  background: 'rgba(99,102,241,0.1)',
                  border: '2px solid rgba(99,102,241,0.3)',
                  color: C.primary, fontWeight: '700', fontSize: '15px',
                  marginBottom: '20px',
                }}
              >
                🧠 RAG Active — your notes will personalise all future content
                in this session!
              </div>
            )}
            {result.rag_error && (
              <p style={{ color: C.error, fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ Notes saved but RAG could not be initialised: {result.rag_error}
              </p>
            )}
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '12px 32px', fontSize: '15px' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, color: C.text, fontSize: '22px' }}>📤 Upload Your Notes</h2>
            <p style={{ margin: '4px 0 0 0', color: C.textSec, fontSize: '13px' }}>
              Personalise your learning with AI-powered RAG
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '22px',
              cursor: 'pointer', color: C.textSec, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'text', label: '📝 Paste Text' },
            { key: 'file', label: '📂 Upload File' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontWeight: '700', fontSize: '14px',
                background: tab === t.key ? C.primary : 'var(--surface-elevated)',
                color: tab === t.key ? 'white' : C.textSec,
                transition: 'all 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'text' ? (
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Paste your notes, study material, or any relevant text here…"
            style={{
              width: '100%', height: '200px', resize: 'vertical',
              padding: '14px', borderRadius: '10px',
              border: `2px solid ${C.border}`,
              background: 'var(--background)', color: C.text,
              fontSize: '14px', fontFamily: 'inherit', lineHeight: '1.6',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: '200px', border: `2px dashed ${dragging ? C.primary : C.border}`,
              borderRadius: '12px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px',
              cursor: 'pointer', background: dragging ? 'rgba(99,102,241,0.06)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />
            <div style={{ fontSize: '40px' }}>{file ? '📄' : '☁️'}</div>
            {file ? (
              <>
                <p style={{ color: C.primary, fontWeight: '700', margin: 0 }}>{file.name}</p>
                <p style={{ color: C.textSec, fontSize: '12px', margin: 0 }}>
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </p>
              </>
            ) : (
              <>
                <p style={{ color: C.textSec, margin: 0, fontWeight: '600' }}>
                  Drop your file here, or click to browse
                </p>
                <p style={{ color: C.textSec, fontSize: '12px', margin: 0 }}>
                  Supports PDF, TXT, MD
                </p>
              </>
            )}
          </div>
        )}

        {/* Info note */}
        <div style={{
          marginTop: '16px', padding: '12px 14px', borderRadius: '10px',
          background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
          fontSize: '13px', color: C.textSec, lineHeight: '1.5',
        }}>
          🧠 <strong style={{ color: C.primary }}>How it works:</strong> Your notes are embedded
          and used to personalise checkpoint generation, explanations, and quiz questions — so
          everything is tailored to what <em>you</em> already know.
        </div>

        {error && (
          <div style={{
            marginTop: '14px', padding: '12px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: C.error, fontSize: '14px', fontWeight: '600',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: `2px solid ${C.border}`, background: 'none',
              color: C.textSec, fontWeight: '600', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
              background: C.primary, color: 'white', fontWeight: '700',
              cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '14px',
              opacity: uploading ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {uploading ? '⏳ Uploading & Building RAG…' : '🚀 Upload & Activate RAG'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesUpload;