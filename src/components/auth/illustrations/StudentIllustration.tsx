export function StudentIllustration() {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-sm"
    >
      {/* Background circles */}
      <circle cx="200" cy="200" r="180" fill="white" fillOpacity="0.1" />
      <circle cx="200" cy="200" r="140" fill="white" fillOpacity="0.1" />
      
      {/* Student body */}
      <ellipse cx="200" cy="340" rx="60" ry="30" fill="#4A90A4" />
      
      {/* Legs */}
      <rect x="170" y="290" width="25" height="50" rx="12" fill="#5B8C5A" />
      <rect x="205" y="290" width="25" height="50" rx="12" fill="#5B8C5A" />
      
      {/* Shoes */}
      <ellipse cx="182" cy="340" rx="18" ry="10" fill="#2C3E50" />
      <ellipse cx="218" cy="340" rx="18" ry="10" fill="#2C3E50" />
      
      {/* Torso */}
      <rect x="155" y="200" width="90" height="100" rx="20" fill="#4A90A4" />
      
      {/* Shirt collar */}
      <path d="M175 200 L200 230 L225 200" stroke="white" strokeWidth="3" fill="none" />
      
      {/* Arms */}
      <rect x="120" y="210" width="40" height="70" rx="15" fill="#4A90A4" />
      <rect x="240" y="210" width="40" height="70" rx="15" fill="#4A90A4" />
      
      {/* Hands */}
      <circle cx="140" cy="290" r="18" fill="#FFD5B5" />
      <circle cx="260" cy="290" r="18" fill="#FFD5B5" />
      
      {/* Head */}
      <circle cx="200" cy="140" r="60" fill="#FFD5B5" />
      
      {/* Hair */}
      <ellipse cx="200" cy="100" rx="55" ry="35" fill="#4A3728" />
      <ellipse cx="165" cy="115" rx="15" ry="25" fill="#4A3728" />
      <ellipse cx="235" cy="115" rx="15" ry="25" fill="#4A3728" />
      
      {/* Face */}
      <circle cx="175" cy="135" r="8" fill="#2C3E50" /> {/* Left eye */}
      <circle cx="225" cy="135" r="8" fill="#2C3E50" /> {/* Right eye */}
      <circle cx="178" cy="132" r="3" fill="white" /> {/* Left eye highlight */}
      <circle cx="228" cy="132" r="3" fill="white" /> {/* Right eye highlight */}
      
      {/* Smile */}
      <path d="M180 165 Q200 185 220 165" stroke="#2C3E50" strokeWidth="4" strokeLinecap="round" fill="none" />
      
      {/* Cheeks */}
      <circle cx="160" cy="155" r="12" fill="#FFB5B5" fillOpacity="0.5" />
      <circle cx="240" cy="155" r="12" fill="#FFB5B5" fillOpacity="0.5" />
      
      {/* Backpack straps */}
      <rect x="165" y="195" width="12" height="80" rx="4" fill="#E67E22" />
      <rect x="223" y="195" width="12" height="80" rx="4" fill="#E67E22" />
      
      {/* Backpack (behind body) */}
      <rect x="155" y="210" width="90" height="70" rx="15" fill="#D35400" transform="translate(0, 10)" />
      
      {/* Books in hand */}
      <rect x="245" y="265" width="35" height="50" rx="3" fill="#3498DB" />
      <rect x="248" y="268" width="32" height="8" rx="2" fill="#2980B9" />
      <rect x="248" y="280" width="32" height="8" rx="2" fill="#2980B9" />
      <rect x="248" y="292" width="32" height="8" rx="2" fill="#2980B9" />
      
      {/* Floating elements */}
      <g className="animate-pulse">
        <circle cx="320" cy="100" r="8" fill="#F1C40F" />
        <circle cx="80" cy="150" r="6" fill="#E74C3C" />
        <circle cx="340" cy="250" r="5" fill="#9B59B6" />
        <circle cx="60" cy="280" r="7" fill="#1ABC9C" />
      </g>
      
      {/* Graduation cap hint */}
      <rect x="155" y="68" width="90" height="8" rx="2" fill="#2C3E50" />
      <rect x="180" y="58" width="40" height="15" rx="2" fill="#2C3E50" />
      <rect x="197" y="50" width="6" height="12" fill="#2C3E50" />
      <circle cx="200" cy="48" r="8" fill="#F1C40F" />
    </svg>
  );
}
