export function TeacherIllustration() {
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
      
      {/* Blackboard */}
      <rect x="60" y="80" width="280" height="180" rx="8" fill="#2C3E50" />
      <rect x="70" y="90" width="260" height="160" rx="4" fill="#1A252F" />
      
      {/* Chalk writing */}
      <text x="100" y="140" fill="white" fontSize="24" fontFamily="serif">E = mc²</text>
      <line x1="100" y1="170" x2="280" y2="170" stroke="white" strokeWidth="2" strokeDasharray="8 4" />
      <text x="100" y="200" fill="#F1C40F" fontSize="18" fontFamily="serif">Welcome!</text>
      
      {/* Chalk */}
      <rect x="290" y="220" width="30" height="10" rx="2" fill="white" />
      
      {/* Teacher body */}
      <ellipse cx="200" cy="370" rx="50" ry="20" fill="#34495E" />
      
      {/* Legs */}
      <rect x="175" y="320" width="20" height="50" rx="8" fill="#2C3E50" />
      <rect x="205" y="320" width="20" height="50" rx="8" fill="#2C3E50" />
      
      {/* Shoes */}
      <ellipse cx="185" cy="365" rx="15" ry="8" fill="#1A1A1A" />
      <ellipse cx="215" cy="365" rx="15" ry="8" fill="#1A1A1A" />
      
      {/* Torso - Professional suit */}
      <rect x="165" y="240" width="70" height="90" rx="15" fill="#34495E" />
      
      {/* Tie */}
      <polygon points="200,245 190,260 200,330 210,260" fill="#C0392B" />
      
      {/* Shirt collar */}
      <path d="M180 245 L200 265 L220 245" stroke="white" strokeWidth="4" fill="none" />
      
      {/* Arms */}
      <rect x="135" y="250" width="35" height="60" rx="12" fill="#34495E" />
      <rect x="230" y="250" width="35" height="60" rx="12" fill="#34495E" />
      
      {/* Hands */}
      <circle cx="152" cy="320" r="15" fill="#FFD5B5" />
      <circle cx="248" cy="320" r="15" fill="#FFD5B5" />
      
      {/* Pointer in hand */}
      <rect x="245" y="270" width="80" height="6" rx="2" fill="#8B4513" transform="rotate(-30, 245, 273)" />
      
      {/* Head */}
      <circle cx="200" cy="195" r="50" fill="#FFD5B5" />
      
      {/* Hair - Professional style */}
      <ellipse cx="200" cy="160" rx="48" ry="28" fill="#4A3728" />
      <rect x="155" y="160" width="90" height="20" rx="5" fill="#4A3728" />
      
      {/* Glasses */}
      <circle cx="180" cy="195" r="18" stroke="#2C3E50" strokeWidth="3" fill="none" />
      <circle cx="220" cy="195" r="18" stroke="#2C3E50" strokeWidth="3" fill="none" />
      <line x1="198" y1="195" x2="202" y2="195" stroke="#2C3E50" strokeWidth="3" />
      <line x1="162" y1="190" x2="155" y2="185" stroke="#2C3E50" strokeWidth="3" />
      <line x1="238" y1="190" x2="245" y2="185" stroke="#2C3E50" strokeWidth="3" />
      
      {/* Eyes behind glasses */}
      <circle cx="180" cy="195" r="5" fill="#2C3E50" />
      <circle cx="220" cy="195" r="5" fill="#2C3E50" />
      <circle cx="182" cy="193" r="2" fill="white" />
      <circle cx="222" cy="193" r="2" fill="white" />
      
      {/* Smile */}
      <path d="M185 215 Q200 228 215 215" stroke="#2C3E50" strokeWidth="3" strokeLinecap="round" fill="none" />
      
      {/* Floating education elements */}
      <g className="animate-pulse">
        {/* Book */}
        <rect x="50" y="320" width="25" height="35" rx="2" fill="#3498DB" />
        <line x1="62" y1="325" x2="62" y2="350" stroke="#2980B9" strokeWidth="2" />
        
        {/* Apple */}
        <circle cx="340" cy="320" r="15" fill="#E74C3C" />
        <rect x="337" y="302" width="6" height="10" rx="2" fill="#8B4513" />
        <ellipse cx="345" cy="308" rx="5" ry="3" fill="#27AE60" />
        
        {/* Stars */}
        <polygon points="70,120 73,130 83,130 75,137 78,147 70,141 62,147 65,137 57,130 67,130" fill="#F1C40F" />
        <polygon points="330,150 332,157 340,157 334,162 336,169 330,165 324,169 326,162 320,157 328,157" fill="#F1C40F" />
      </g>
      
      {/* A+ grade */}
      <circle cx="320" cy="100" r="25" fill="#27AE60" />
      <text x="305" y="108" fill="white" fontSize="20" fontWeight="bold">A+</text>
    </svg>
  );
}
