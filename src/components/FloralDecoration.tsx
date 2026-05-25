export function FloralLeft({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.7">
        {/* Main branch */}
        <path
          d="M180 180 C140 140, 100 120, 60 100 C40 90, 30 70, 40 50 C50 30, 70 25, 80 35"
          stroke="#7da67d"
          strokeWidth="2"
          fill="none"
        />
        {/* Leaves */}
        <ellipse cx="70" cy="60" rx="18" ry="8" transform="rotate(-30 70 60)" fill="#7da67d" opacity="0.5" />
        <ellipse cx="90" cy="80" rx="15" ry="7" transform="rotate(-45 90 80)" fill="#9dbd9d" opacity="0.4" />
        <ellipse cx="50" cy="45" rx="14" ry="6" transform="rotate(-20 50 45)" fill="#7da67d" opacity="0.6" />
        <ellipse cx="110" cy="95" rx="16" ry="7" transform="rotate(-50 110 95)" fill="#9dbd9d" opacity="0.35" />
        {/* Flower 1 */}
        <circle cx="45" cy="38" r="8" fill="#e8c4c4" opacity="0.6" />
        <circle cx="45" cy="38" r="4" fill="#d4a0a0" opacity="0.7" />
        {/* Flower 2 */}
        <circle cx="80" cy="35" r="10" fill="#f0d5d5" opacity="0.5" />
        <circle cx="80" cy="35" r="5" fill="#d4a0a0" opacity="0.6" />
        {/* Small buds */}
        <circle cx="100" cy="105" r="4" fill="#e8c4c4" opacity="0.5" />
        <circle cx="130" cy="125" r="3" fill="#f0d5d5" opacity="0.4" />
        {/* Additional leaf sprigs */}
        <path
          d="M60 100 C50 85, 35 80, 25 70"
          stroke="#9dbd9d"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
        />
        <ellipse cx="28" cy="72" rx="10" ry="5" transform="rotate(-25 28 72)" fill="#7da67d" opacity="0.3" />
      </g>
    </svg>
  );
}

export function FloralRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: "scaleX(-1)" }}
    >
      <g opacity="0.7">
        <path
          d="M180 180 C140 140, 100 120, 60 100 C40 90, 30 70, 40 50 C50 30, 70 25, 80 35"
          stroke="#7da67d"
          strokeWidth="2"
          fill="none"
        />
        <ellipse cx="70" cy="60" rx="18" ry="8" transform="rotate(-30 70 60)" fill="#7da67d" opacity="0.5" />
        <ellipse cx="90" cy="80" rx="15" ry="7" transform="rotate(-45 90 80)" fill="#9dbd9d" opacity="0.4" />
        <ellipse cx="50" cy="45" rx="14" ry="6" transform="rotate(-20 50 45)" fill="#7da67d" opacity="0.6" />
        <ellipse cx="110" cy="95" rx="16" ry="7" transform="rotate(-50 110 95)" fill="#9dbd9d" opacity="0.35" />
        <circle cx="45" cy="38" r="8" fill="#e8c4c4" opacity="0.6" />
        <circle cx="45" cy="38" r="4" fill="#d4a0a0" opacity="0.7" />
        <circle cx="80" cy="35" r="10" fill="#f0d5d5" opacity="0.5" />
        <circle cx="80" cy="35" r="5" fill="#d4a0a0" opacity="0.6" />
        <circle cx="100" cy="105" r="4" fill="#e8c4c4" opacity="0.5" />
        <circle cx="130" cy="125" r="3" fill="#f0d5d5" opacity="0.4" />
        <path
          d="M60 100 C50 85, 35 80, 25 70"
          stroke="#9dbd9d"
          strokeWidth="1.5"
          fill="none"
          opacity="0.4"
        />
        <ellipse cx="28" cy="72" rx="10" ry="5" transform="rotate(-25 28 72)" fill="#7da67d" opacity="0.3" />
      </g>
    </svg>
  );
}
