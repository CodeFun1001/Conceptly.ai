import { useState, useEffect } from 'react';
import { analyticsAPI, gamificationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';

const useCSSVar = (varName, fallback) => {
  const [val, setVal] = useState(fallback);
  useEffect(() => {
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
    if (computed) setVal(computed);
  }, [varName]);
  return val;
};

const C = {
  primary:   '#6366F1',
  secondary: '#A78BFA',
  success:   '#10B981',
  warning:   '#F59E0B',
  error:     '#EF4444',
  border:    '#E2E8F0',
  textSec:   '#64748B',
  gold:      '#FFD700',
  bronze:    '#CD7F32',
  silver:    '#9E9E9E',
  platinum:  '#9575CD',
  orange:    '#FF6B35',
};

const BarChart = ({ data, primaryColor = C.primary, secondaryColor = C.secondary, height = 160 }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: C.textSec, fontSize: '14px' }}>
        No data yet — complete some sessions to see stats here!
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${height}px`, padding: '0 4px' }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * (height - 36), d.value > 0 ? 6 : 2);
        const color = d.highlight ? secondaryColor : primaryColor;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textSec, minHeight: '16px' }}>
              {d.value > 0 ? d.value : ''}
            </div>
            <div
              style={{
                width: '100%', height: `${barH}px`,
                background: `linear-gradient(180deg, ${color}CC, ${color})`,
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: `0 -2px 8px ${color}44`,
                opacity: d.value === 0 ? 0.25 : 1,
                cursor: 'default',
              }}
              title={`${d.label}: ${d.value}`}
            />
            <div style={{ fontSize: '10px', color: C.textSec, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', paddingBottom: '2px' }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DonutChart = ({ percentage, color = C.primary, trackColor = '#E2E8F0', size = 130, label = '' }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(percentage, 0), 100);
  const filled = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={trackColor} strokeWidth="11" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
        <text x="50" y="46" textAnchor="middle" style={{ fontSize: '17px', fontWeight: '800', fill: color, fontFamily: 'inherit' }}>
          {pct}%
        </text>
        <text x="50" y="60" textAnchor="middle" style={{ fontSize: '8px', fill: C.textSec, fontFamily: 'inherit' }}>
          {label}
        </text>
      </svg>
    </div>
  );
};

const HBar = ({ value, max = 100, color = C.primary, label = '', showPct = true }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{label}</span>
          {showPct && <span style={{ fontSize: '13px', color, fontWeight: '700' }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ height: '10px', background: '#E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}BB)`, borderRadius: '99px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

const TIERS = {
  bronze:   { bg: '#CD7F32', glow: '#CD7F3244', text: '#A0522D', label: 'Bronze' },
  silver:   { bg: '#9E9E9E', glow: '#9E9E9E44', text: '#757575', label: 'Silver' },
  gold:     { bg: '#FFD700', glow: '#FFD70044', text: '#F9A825', label: 'Gold'   },
  platinum: { bg: '#9575CD', glow: '#9575CD44', text: '#7E57C2', label: 'Plat.'  },
};

const BadgeTile = ({ name, defn, earned }) => {
  const tier = TIERS[defn?.tier] || TIERS.bronze;
  const icon = defn?.icon || '🏅';
  const displayName = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div
      title={defn?.description || name}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '6px', padding: '14px 10px', borderRadius: '14px',
        minWidth: '88px', maxWidth: '108px', textAlign: 'center',
        background: earned ? `${tier.glow}` : 'rgba(0,0,0,0.04)',
        border: `2px solid ${earned ? tier.bg : '#D1D5DB'}`,
        opacity: earned ? 1 : 0.45,
        filter: earned ? 'none' : 'grayscale(0.9)',
        transition: 'all 0.2s ease',
        position: 'relative',
        boxShadow: earned ? `0 0 12px ${tier.glow}` : 'none',
        cursor: 'default',
      }}
    >
      {earned && (
        <div style={{
          position: 'absolute', top: '-9px', right: '-7px',
          background: tier.bg, color: 'white', fontSize: '8px',
          fontWeight: '800', padding: '2px 6px', borderRadius: '8px',
          textTransform: 'uppercase', letterSpacing: '0.4px',
          boxShadow: `0 2px 6px ${tier.glow}`,
        }}>
          {tier.label}
        </div>
      )}
      <div style={{ fontSize: '30px', lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: '11px', fontWeight: '700', color: earned ? tier.text : C.textSec, lineHeight: '1.3' }}>
        {displayName}
      </div>
      {!earned && (
        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>🔒 Locked</div>
      )}
    </div>
  );
};

const GROUP_LABELS = {
  milestone:   '🚀 Milestones',
  performance: '🎯 Performance',
  streak:      '🔥 Streaks',
  checkpoint:  '✅ Checkpoints',
  level:       '⭐ Levels',
  resilience:  '💪 Resilience',
  challenge:   '🎮 Challenges',
  efficiency:  '💨 Efficiency',
  xp:          '💎 XP',
};

const Analytics = () => {
  const [analytics, setAnalytics]     = useState(null);
  const [progress, setProgress]       = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [badgeDefs, setBadgeDefs]     = useState({});
  const [weakTopics, setWeakTopics]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('overview');

  const borderColor = useCSSVar('--border', '#E2E8F0');

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const [analyticsRes, progressRes, badgesRes, weakRes, badgeDefsRes] = await Promise.all([
        analyticsAPI.get(),
        analyticsAPI.getProgress(),
        gamificationAPI.getBadges(),
        gamificationAPI.getWeakTopics(),
        gamificationAPI.getBadgeDefinitions(),
      ]);
      setAnalytics(analyticsRes.data);
      setProgress(progressRes.data);
      setEarnedBadges(badgesRes.data);
      setWeakTopics(weakRes.data);
      setBadgeDefs(badgeDefsRes.data || {});
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  const completionRate = Math.round(progress?.completion_rate || 0);
  const avgScore       = Math.round((progress?.avg_score || 0) * 100);
  const streak         = analytics?.current_streak   || 0;
  const longestStreak  = analytics?.longest_streak   || 0;

  const earnedBadgeNames = new Set(earnedBadges.map(b => b.badge_name));
  const totalBadges  = Object.keys(badgeDefs).length;
  const earnedCount  = earnedBadgeNames.size;
  const badgePct     = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  const performanceBars = [
    { label: 'Avg Score',   value: avgScore,         highlight: false },
    { label: 'Completion',  value: completionRate,   highlight: true  },
    { label: 'Checkpoints', value: Math.min((progress?.completed_checkpoints || 0) * 5, 100), highlight: false },
  ];

  const sessionBars = [
    { label: 'Total',     value: progress?.total_sessions || 0,      highlight: false },
    { label: 'Completed', value: progress?.completed_sessions || 0,   highlight: true  },
    { label: 'In Progress', value: Math.max((progress?.total_sessions || 0) - (progress?.completed_sessions || 0), 0), highlight: false },
  ];

  const badgeGroups = {};
  Object.entries(badgeDefs).forEach(([name, defn]) => {
    const t = defn.badge_type;
    if (!badgeGroups[t]) badgeGroups[t] = [];
    badgeGroups[t].push({ name, defn, earned: earnedBadgeNames.has(name) });
  });
  Object.values(badgeGroups).forEach(arr =>
    arr.sort((a, b) => Number(b.earned) - Number(a.earned))
  );

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'badges',   label: `🏆 Badges (${earnedCount}/${totalBadges})` },
    { key: 'weak',     label: `📝 Weak Areas (${weakTopics.length})` },
  ];

  return (
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 1024 ? '280px 1fr' : '1fr', gap: '24px' }}>
        {window.innerWidth > 1024 && <Sidebar />}

        <div>
          <div className="card card-elevated fade-in" style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: 'white', marginBottom: '24px', border: 'none'
          }}>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '26px' }}>📊 Learning Analytics</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>Track your progress, streaks & achievements</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '14px', padding: '10px 18px' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-3 slide-in" style={{ marginBottom: '24px' }}>
                {[
                  { label: 'Total Sessions',     value: progress?.total_sessions || 0,       color: C.primary  },
                  { label: 'Completed Sessions',  value: progress?.completed_sessions || 0,   color: C.success  },
                  { label: 'Avg Quiz Score',      value: `${avgScore}%`,                      color: avgScore >= 70 ? C.success : avgScore >= 50 ? C.warning : C.error },
                  { label: 'Total Checkpoints',   value: progress?.total_checkpoints || 0,    color: C.primary  },
                  { label: 'Done Checkpoints',    value: progress?.completed_checkpoints || 0, color: C.success },
                  { label: 'Completion Rate',     value: `${completionRate}%`,                color: completionRate >= 70 ? C.success : completionRate >= 40 ? C.warning : C.error },
                ].map((m, i) => (
                  <div key={i} className="metric-card">
                    <div className="metric-label">{m.label}</div>
                    <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-2 slide-in" style={{ marginBottom: '24px', animationDelay: '0.1s' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '4px', color: 'var(--primary)' }}>📈 Performance Snapshot</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', margin: '0 0 16px 0' }}>
                    Scores, completion rate & checkpoint activity (%)
                  </p>
                  <BarChart data={performanceBars} primaryColor={C.primary} secondaryColor={C.secondary} height={160} />
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>🎯 Key Rates</h3>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                    <DonutChart
                      percentage={completionRate}
                      color={completionRate >= 70 ? C.success : completionRate >= 40 ? C.warning : C.error}
                      trackColor={borderColor || '#E2E8F0'}
                      size={130}
                      label="Completion"
                    />
                    <DonutChart
                      percentage={avgScore}
                      color={avgScore >= 70 ? C.success : avgScore >= 50 ? C.warning : C.error}
                      trackColor={borderColor || '#E2E8F0'}
                      size={130}
                      label="Avg Score"
                    />
                    <DonutChart
                      percentage={badgePct}
                      color={C.gold}
                      trackColor={borderColor || '#E2E8F0'}
                      size={130}
                      label="Badges"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-2 slide-in" style={{ marginBottom: '24px', animationDelay: '0.2s' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>🔥 Streak Tracker</h3>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Current Streak', value: streak,        unit: 'days', color: C.orange, icon: '🔥' },
                      { label: 'Longest Streak', value: longestStreak, unit: 'days', color: C.secondary, icon: '⭐' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        flex: 1, padding: '16px', borderRadius: '12px',
                        background: `${s.color}18`, border: `2px solid ${s.color}44`,
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '30px', fontWeight: '800', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: C.textSec, fontWeight: '600', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <HBar value={streak} max={7} color={C.orange} label={`Progress to 7-day streak (${streak}/7)`} />
                  {streak >= 7 && (
                    <div style={{ marginTop: '10px', fontSize: '13px', color: C.success, fontWeight: '600' }}>
                      🌟 Week Warrior unlocked! Keep it up!
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '4px', color: 'var(--primary)' }}>📚 Session Overview</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                    Total, completed & in-progress sessions
                  </p>
                  <BarChart data={sessionBars} primaryColor={C.primary} secondaryColor={C.success} height={140} />
                  <div style={{ marginTop: '16px' }}>
                    <HBar
                      value={progress?.completed_sessions || 0}
                      max={Math.max(progress?.total_sessions || 1, 1)}
                      color={C.success}
                      label={`Sessions completed: ${progress?.completed_sessions || 0} / ${progress?.total_sessions || 0}`}
                    />
                  </div>
                </div>
              </div>

              <div
                className="card slide-in"
                style={{ animationDelay: '0.3s', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => setActiveTab('badges')}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>🏆 Badge Collection</h3>
                  <span style={{ color: C.primary, fontSize: '13px', fontWeight: '700' }}>View all →</span>
                </div>
                <HBar value={earnedCount} max={totalBadges} color={C.gold} label={`${earnedCount} / ${totalBadges} badges earned`} />
                {earnedCount === 0 && (
                  <p style={{ fontSize: '13px', color: C.textSec, margin: '12px 0 0 0' }}>
                    Complete sessions and quizzes to unlock your first badge!
                  </p>
                )}
                {earnedCount > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {earnedBadges.slice(0, 6).map(b => {
                      const defn = badgeDefs[b.badge_name];
                      if (!defn) return null;
                      const tier = TIERS[defn.tier] || TIERS.bronze;
                      return (
                        <div key={b.id} title={b.description} style={{
                          padding: '8px 12px', borderRadius: '10px',
                          background: `${tier.glow}`, border: `2px solid ${tier.bg}`,
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '13px', fontWeight: '700', color: tier.text,
                        }}>
                          <span style={{ fontSize: '18px' }}>{defn.icon}</span>
                          {b.badge_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'badges' && (
            <div className="fade-in">
              <div className="card" style={{
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(167,139,250,0.1))',
                border: `2px solid ${C.primary}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', color: 'var(--primary)' }}>🏆 Badge Collection</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Earn badges by completing goals, streaks, and high quiz scores — just like LeetCode!
                    </p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px 20px', background: C.primary, borderRadius: '12px', color: 'white' }}>
                    <div style={{ fontSize: '26px', fontWeight: '800' }}>{earnedCount}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>of {totalBadges} earned</div>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <HBar value={earnedCount} max={totalBadges} color={C.gold} label="" showPct={false} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {Object.entries(TIERS).map(([tier, colors]) => (
                  <div key={tier} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 12px', borderRadius: '20px',
                    background: colors.glow, border: `1.5px solid ${colors.bg}`,
                  }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: colors.bg }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>{tier}</span>
                  </div>
                ))}
              </div>

              {Object.keys(badgeDefs).length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: C.textSec }}>
                  Loading badges...
                </div>
              ) : (
                Object.entries(badgeGroups).map(([type, badges]) => (
                  <div key={type} className="card" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>
                      {GROUP_LABELS[type] || type}
                      <span style={{ marginLeft: '10px', fontSize: '13px', color: C.textSec, fontWeight: '500' }}>
                        {badges.filter(b => b.earned).length}/{badges.length} earned
                      </span>
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {badges.map(({ name, defn, earned }) => (
                        <BadgeTile key={name} name={name} defn={defn} earned={earned} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'weak' && (
            <div className="fade-in">
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '6px', color: 'var(--primary)' }}>📝 Areas to Review</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>
                  Based on your quiz performance — focus on these to improve your scores. Each unique topic is shown once.
                </p>
              </div>

              {weakTopics.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                  <h3 style={{ color: C.success }}>No weak areas!</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Complete more quizzes to get targeted insights.</p>
                </div>
              ) : (
                <>
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--primary)' }}>📊 Strength Overview</h4>
                    <BarChart
                      data={weakTopics.map(w => ({
                        label: w.concept.length > 10 ? w.concept.substring(0, 10) + '…' : w.concept,
                        value: Math.round(w.strength_score * 100),
                        highlight: w.strength_score < 0.4,
                      }))}
                      primaryColor={C.warning}
                      secondaryColor={C.error}
                      height={140}
                    />
                  </div>

                  {weakTopics.map((weak, idx) => {
                    const pct = Math.round(weak.strength_score * 100);
                    const color = pct < 40 ? C.error : C.warning;
                    return (
                      <div key={idx} className="card fade-in" style={{
                        marginBottom: '12px',
                        borderLeft: `4px solid ${color}`,
                        transition: 'transform 0.2s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px', fontSize: '15px' }}>
                              {weak.concept}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Topic: <strong>{weak.topic}</strong> · Last practiced: {new Date(weak.last_practiced).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{
                            padding: '4px 12px', borderRadius: '20px',
                            background: `${color}18`, border: `1.5px solid ${color}`,
                            color, fontWeight: '800', fontSize: '15px', flexShrink: 0, marginLeft: '12px',
                          }}>
                            {pct}%
                          </div>
                        </div>
                        <HBar value={pct} max={100} color={color} label="" showPct={false} />
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.textSec }}>
                          {pct < 40 ? '⚠️ Needs focused review' : '📖 Keep practising'}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;