import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Lock, Zap } from 'lucide-react'

const STYLES = `
@keyframes cp-pulse-ring {
  0%,100% { box-shadow: 0 0 0 0 rgba(127,119,221,0.45); }
  50%      { box-shadow: 0 0 0 7px rgba(127,119,221,0); }
}
@keyframes cp-pop-in {
  from { transform: scale(0.55); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
@keyframes cp-xp-float {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-28px) scale(0.85); }
}
@keyframes cp-trail-draw {
  from { stroke-dashoffset: 120; }
  to   { stroke-dashoffset: 0; }
}
`

function injectStyles() {
  if (document.getElementById('cp-stepper-styles')) return
  const tag = document.createElement('style')
  tag.id = 'cp-stepper-styles'
  tag.textContent = STYLES
  document.head.appendChild(tag)
}

// ── XP pop overlay ────────────────────────────────────────────
function XPPop({ xp }) {
  return (
    <span style={{
      position: 'absolute', top: -6, right: 10, zIndex: 10,
      fontSize: 11, fontWeight: 600, color: '#1D9E75',
      pointerEvents: 'none', whiteSpace: 'nowrap',
      animation: 'cp-xp-float 1s ease forwards',
    }}>
      +{xp} XP
    </span>
  )
}

function LevelBadge({ level }) {
  const colors = { 
    beginner: 'pill-green', 
    intermediate: 'pill-purple', 
    advanced: 'pill-pink' 
  }

  return (
    <span className={`pill ${colors[level] || 'pill-purple'}`}>
      {level}
    </span>
  )
}

// ── Connector SVG between nodes ───────────────────────────────
function Connector({ fromRight, unlocked }) {
  const stroke = unlocked ? '#7F77DD' : 'var(--color-border-secondary)'
  const dash   = unlocked ? 'none' : '6 5'
  // fromRight: path curves left → right-to-left diagonal
  const d = fromRight
    ? 'M 30 0 C 30 22, -60 22, -60 44'
    : 'M 30 0 C 30 22, 120 22, 120 44'

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: fromRight ? 'flex-end' : 'flex-start',
      paddingRight: fromRight ? 50 : 0,
      paddingLeft:  fromRight ? 0  : 50,
    }}>
      <svg width="60" height="44" viewBox="0 0 60 44" overflow="visible">
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray={dash}
          strokeLinecap="round"
          style={unlocked ? {
            strokeDasharray: 120,
            strokeDashoffset: 0,
            animation: 'cp-trail-draw 0.4s ease forwards',
          } : {}}
        />
      </svg>
    </div>
  )
}

// ── Single checkpoint card ────────────────────────────────────
function CheckpointCard({ cp, index, state, animDelay, onSelect, showXP }) {
  // state: 'done' | 'active' | 'upcoming' | 'locked'
  const circleStyles = {
    done:     { background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75' },
    active:   { background: '#EEEDFE', color: '#534AB7', border: '1.5px solid #7F77DD',
                animation: 'cp-pulse-ring 2s ease-in-out infinite' },
    upcoming: { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-secondary)' },
    locked:   { background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)',
                border: '1px dashed var(--color-border-tertiary)' },
  }

  const cardBorder = {
    done:     '1px solid #1D9E75',
    active:   '1.5px solid #7F77DD',
    upcoming: '0.5px solid var(--color-border-secondary)',
    locked:   '0.5px solid var(--color-border-tertiary)',
  }

  return (
    <div
      onClick={() => state !== 'locked' && onSelect(index)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        borderRadius: 14,
        border: cardBorder[state],
        background: 'var(--color-background-primary)',
        cursor: state === 'locked' ? 'not-allowed' : 'pointer',
        opacity: state === 'locked' ? 0.45 : 1,
        width: 264,
        position: 'relative',
        transition: 'transform 0.15s, border-color 0.2s',
        animation: `cp-pop-in 0.3s ease ${animDelay}s both`,
      }}
      onMouseEnter={e => { if (state !== 'locked') e.currentTarget.style.transform = 'scale(1.03)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {showXP && <XPPop xp={cp.xp_earned || 50} />}

      {/* Circle */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, flexShrink: 0,
        ...circleStyles[state],
      }}>
        {state === 'done'   && <CheckCircle2 size={16} />}
        {state === 'locked' && <Lock size={13} />}
        {(state === 'active' || state === 'upcoming') && (index + 1)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.3,
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cp.topic}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <LevelBadge level={cp.level} />
          {cp.understanding_score != null && (
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
              {Math.round(cp.understanding_score * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Badge */}
      {state === 'done' && (
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: '#E1F5EE', color: '#0F6E56', fontWeight: 600, flexShrink: 0,
        }}>Done</span>
      )}
      {state === 'active' && (
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: '#EEEDFE', color: '#534AB7', fontWeight: 600, flexShrink: 0,
        }}>Now</span>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ checkpoints }) {
  const done  = checkpoints.filter(c => c.status === 'completed').length
  const total = checkpoints.length
  const pct   = total ? Math.round((done / total) * 100) : 0
  const xp    = checkpoints.reduce((sum, c) => sum + (c.xp_earned || 0), 0)

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6,
      }}>
        <span>{done} of {total} checkpoints</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Zap size={10} style={{ color: '#EF9F27' }} />
          {xp} XP
        </span>
      </div>
      <div style={{
        height: 5, borderRadius: 8,
        background: 'var(--color-background-secondary)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 8,
          background: '#7F77DD',
          width: pct + '%',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}
export default function GamePathStepper({ checkpoints, activeIdx, onSelect, newlyDone }) {
  useEffect(() => { injectStyles() }, [])
  const [xpPopIdx, setXpPopIdx] = useState(null)
  const prevDone = useRef(null)

  useEffect(() => {
    if (newlyDone != null && newlyDone !== prevDone.current) {
      prevDone.current = newlyDone
      setXpPopIdx(newlyDone)
      const t = setTimeout(() => setXpPopIdx(null), 1100)
      return () => clearTimeout(t)
    }
  }, [newlyDone])

  if (!checkpoints.length) return null

  // Alternate left / right placement (Duolingo-style zigzag)
  const isRight = (i) => i % 2 !== 0

  function getState(cp, i) {
    if (cp.status === 'completed') return 'done'
    if (i === activeIdx)           return 'active'
    if (i > activeIdx)             return 'locked'
    return 'upcoming'
  }

  return (
    <div>
      <ProgressBar checkpoints={checkpoints} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {checkpoints.map((cp, i) => {
          const right = isRight(i)
          const state = getState(cp, i)

          return (
            <React.Fragment key={cp.id}>
              {/* Node row */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: right ? 'flex-end' : 'flex-start',
              }}>
                <CheckpointCard
                  cp={cp}
                  index={i}
                  state={state}
                  animDelay={i * 0.06}
                  onSelect={onSelect}
                  showXP={xpPopIdx === i}
                />
              </div>

              {/* Connector to next node */}
              {i < checkpoints.length - 1 && (
                <Connector
                  fromRight={right}
                  unlocked={state === 'done' || state === 'active'}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}