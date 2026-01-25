export function EventOrganizerIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Background elements */}
      <circle cx="200" cy="150" r="120" fill="white" fillOpacity="0.1" />
      <circle cx="200" cy="150" r="80" fill="white" fillOpacity="0.1" />

      {/* Calendar/Event board */}
      <rect
        x="120"
        y="80"
        width="160"
        height="140"
        rx="12"
        fill="white"
        fillOpacity="0.95"
      />
      <rect x="120" y="80" width="160" height="35" rx="12" fill="#8B5CF6" />
      <rect x="120" y="103" width="160" height="12" fill="#8B5CF6" />
      
      {/* Calendar header dots */}
      <circle cx="140" cy="95" r="5" fill="white" fillOpacity="0.8" />
      <circle cx="160" cy="95" r="5" fill="white" fillOpacity="0.8" />
      <circle cx="180" cy="95" r="5" fill="white" fillOpacity="0.8" />

      {/* Calendar grid lines */}
      <line x1="120" y1="145" x2="280" y2="145" stroke="#E5E7EB" strokeWidth="1" />
      <line x1="120" y1="175" x2="280" y2="175" stroke="#E5E7EB" strokeWidth="1" />
      <line x1="160" y1="115" x2="160" y2="220" stroke="#E5E7EB" strokeWidth="1" />
      <line x1="200" y1="115" x2="200" y2="220" stroke="#E5E7EB" strokeWidth="1" />
      <line x1="240" y1="115" x2="240" y2="220" stroke="#E5E7EB" strokeWidth="1" />

      {/* Event blocks */}
      <rect x="125" y="120" width="30" height="20" rx="4" fill="#10B981" fillOpacity="0.3" />
      <rect x="165" y="150" width="30" height="20" rx="4" fill="#F59E0B" fillOpacity="0.3" />
      <rect x="205" y="120" width="30" height="20" rx="4" fill="#8B5CF6" fillOpacity="0.3" />
      <rect x="245" y="180" width="30" height="20" rx="4" fill="#EF4444" fillOpacity="0.3" />
      <rect x="165" y="180" width="30" height="20" rx="4" fill="#3B82F6" fillOpacity="0.3" />
      <rect x="125" y="180" width="30" height="20" rx="4" fill="#10B981" fillOpacity="0.3" />

      {/* Floating ticket */}
      <g transform="translate(290, 100) rotate(15)">
        <rect width="50" height="30" rx="4" fill="#F59E0B" />
        <circle cx="0" cy="15" r="5" fill="#1F2937" fillOpacity="0.3" />
        <circle cx="50" cy="15" r="5" fill="#1F2937" fillOpacity="0.3" />
        <line x1="10" y1="10" x2="40" y2="10" stroke="white" strokeWidth="2" />
        <line x1="10" y1="20" x2="30" y2="20" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
      </g>

      {/* Floating megaphone */}
      <g transform="translate(70, 130)">
        <path
          d="M10 20 L30 10 L30 30 L10 20 Z"
          fill="#8B5CF6"
        />
        <rect x="30" y="12" width="15" height="16" rx="2" fill="#8B5CF6" />
        <ellipse cx="45" cy="20" rx="8" ry="10" fill="#A78BFA" />
      </g>

      {/* Stars/sparkles */}
      <path
        d="M320 180 L323 188 L331 188 L325 193 L327 201 L320 196 L313 201 L315 193 L309 188 L317 188 Z"
        fill="#F59E0B"
      />
      <path
        d="M90 90 L92 95 L97 95 L93 98 L94 103 L90 100 L86 103 L87 98 L83 95 L88 95 Z"
        fill="#10B981"
      />

      {/* People icons at bottom */}
      <g transform="translate(150, 230)">
        <circle cx="0" cy="0" r="12" fill="#8B5CF6" />
        <circle cx="0" cy="-5" r="5" fill="white" />
        <path d="M-8 8 Q0 12 8 8" stroke="white" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(180, 235)">
        <circle cx="0" cy="0" r="10" fill="#10B981" />
        <circle cx="0" cy="-4" r="4" fill="white" />
        <path d="M-6 6 Q0 9 6 6" stroke="white" strokeWidth="1.5" fill="none" />
      </g>
      <g transform="translate(210, 230)">
        <circle cx="0" cy="0" r="12" fill="#F59E0B" />
        <circle cx="0" cy="-5" r="5" fill="white" />
        <path d="M-8 8 Q0 12 8 8" stroke="white" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(240, 235)">
        <circle cx="0" cy="0" r="10" fill="#3B82F6" />
        <circle cx="0" cy="-4" r="4" fill="white" />
        <path d="M-6 6 Q0 9 6 6" stroke="white" strokeWidth="1.5" fill="none" />
      </g>
    </svg>
  );
}