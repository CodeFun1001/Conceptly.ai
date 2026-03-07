import { useState, useEffect, useRef } from 'react';

const TIERS = {
  bronze:   { bg: '#CD7F32', glow: '#CD7F3255', text: '#A0522D', label: 'Bronze' },
  silver:   { bg: '#9E9E9E', glow: '#9E9E9E55', text: '#757575', label: 'Silver' },
  gold:     { bg: '#FFD700', glow: '#FFD70055', text: '#F9A825', label: 'Gold'   },
  platinum: { bg: '#9575CD', glow: '#9575CD55', text: '#7E57C2', label: 'Plat.'  },
};

const BadgePopup = ({ badges = [], onClose }) => {
  const [idx, setIdx]       = useState(0);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (badges.length > 0) {
      setIdx(0);
      setExiting(false);
    }
  }, [badges]);

  useEffect(() => {
    if (badges.length === 0) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (idx < badges.length - 1) {
        setIdx(i => i + 1);
      } else {
        dismiss();
      }
    }, 4000);
    return () => clearTimeout(timerRef.current);
  }, [idx, badges]);

  const dismiss = () => {
    setExiting(true);
    clearTimeout(timerRef.current);
    setTimeout(() => {
      setExiting(false);
      if (onClose) onClose();
    }, 320);
  };

  if (!badges || badges.length === 0) return null;
  const badge = badges[idx];
  if (!badge) return null;

  const tier = TIERS[badge.tier] || TIERS.bronze;

  const emojiRe = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
  const emojiMatch = (badge.description || '').match(emojiRe);
  const icon      = emojiMatch ? emojiMatch[0].trim() : '🏅';
  const cleanDesc = (badge.description || '').replace(emojiRe, '').trim();
  const displayName = (badge.badge_name || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      <style>{`
        @keyframes bp-in  { from { transform:translateX(110%); opacity:0 } to { transform:translateX(0); opacity:1 } }
        @keyframes bp-out { from { transform:translateX(0);    opacity:1 } to { transform:translateX(110%); opacity:0 } }
        @keyframes bp-bar { from { width:100% } to { width:0% } }
        @keyframes bp-pop { 0%,100%{transform:scale(1)} 40%{transform:scale(1.18)} }
      `}</style>

      <div
        role="alert"
        aria-live="assertive"
        style={{
          position:  'fixed',
          top:       '24px',
          right:     '24px',
          zIndex:    99999,
          width:     '320px',
          maxWidth:  'calc(100vw - 32px)',
          animation: `${exiting ? 'bp-out' : 'bp-in'} 0.35s cubic-bezier(0.34,1.56,0.64,1) both`,
          pointerEvents: 'auto',
        }}
      >
        <div style={{
          borderRadius: '20px',
          padding:      '20px 20px 16px',
          background:   'var(--surface, #fff)',
          border:       `2.5px solid ${tier.bg}`,
          boxShadow:    `0 8px 32px rgba(0,0,0,0.18), 0 0 0 4px ${tier.glow}`,
          position:     'relative',
          overflow:     'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${tier.glow} 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />

          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              position:   'absolute', top: '10px', right: '12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color:      'var(--text-secondary, #888)',
              fontSize:   '20px', lineHeight: 1, padding: '2px 6px',
              zIndex:     1, borderRadius: '6px',
            }}
          >×</button>

          {badges.length > 1 && (
            <div style={{
              position:   'absolute', top: '10px', left: '14px',
              background: tier.bg, color: 'white',
              fontSize:   '10px', fontWeight: '800',
              padding:    '2px 8px', borderRadius: '10px',
            }}>
              {idx + 1} / {badges.length}
            </div>
          )}

          <div style={{
            textAlign:     'center',
            marginBottom:  '10px',
            marginTop:     badges.length > 1 ? '18px' : '4px',
            fontSize:      '10px', fontWeight: '800',
            letterSpacing: '1.8px', textTransform: 'uppercase',
            color:         tier.text,
          }}>
            🎉 Badge Unlocked!
          </div>

          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:  '68px', height: '68px',
              borderRadius:   '50%',
              background:     `radial-gradient(circle, ${tier.glow} 0%, ${tier.bg}22 100%)`,
              border:         `3px solid ${tier.bg}`,
              fontSize:       '34px',
              boxShadow:      `0 0 18px ${tier.glow}`,
              animation:      'bp-pop 0.5s ease-out',
            }}>
              {icon}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '17px', fontWeight: '800', color: tier.text, marginBottom: '5px' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #666)', lineHeight: '1.55', padding: '0 4px' }}>
              {cleanDesc}
            </div>
            <div style={{
              display:       'inline-block', marginTop: '8px',
              padding:       '3px 12px',    borderRadius: '20px',
              background:    `${tier.bg}22`, border: `1.5px solid ${tier.bg}`,
              fontSize:      '10px',         fontWeight: '800',
              color:         tier.text,      textTransform: 'capitalize',
            }}>
              {tier.label} Badge
            </div>
          </div>

          <div style={{ height: '3px', background: `${tier.bg}33`, borderRadius: '2px', overflow: 'hidden' }}>
            <div
              key={`${badge.badge_name}-${idx}`}
              style={{
                height:    '100%',
                background: tier.bg,
                borderRadius: '2px',
                animation:  'bp-bar 4s linear forwards',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default BadgePopup;