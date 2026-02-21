const Logo = ({ size = 32, style = {}, className = '' }) => {
  return (
    <img
      src="/logo.png"
      alt="Conceptly"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
};

export default Logo;