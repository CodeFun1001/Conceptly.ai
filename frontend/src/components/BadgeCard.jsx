const BadgeCard = ({ badge }) => {
  const badgeIcons = {
    first_topic: '🎯',
    dedicated_learner: '📚',
    high_achiever: '🌟',
    level_5_master: '👑',
    default: '🏆'
  };

  const icon = badgeIcons[badge.badge_name] || badgeIcons.default;

  return (
    <div className="badge-card">
      <div className="badge-icon">{icon}</div>
      <h4 style={{ color: '#4392F1', marginBottom: '8px' }}>
        {badge.badge_name.replace(/_/g, ' ').toUpperCase()}
      </h4>
      <p style={{ color: '#666', fontSize: '14px' }}>
        {badge.description}
      </p>
      <p style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>
        {new Date(badge.earned_at).toLocaleDateString()}
      </p>
    </div>
  );
};

export default BadgeCard;