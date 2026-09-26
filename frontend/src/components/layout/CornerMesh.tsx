export function CornerMesh() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 220"
      fill="none"
      className="pointer-events-none fixed -bottom-10 -right-10 z-0 h-52 w-52 md:h-80 md:w-80 mesh-opacity"
    >
      <defs>
        <linearGradient id="corner-mesh" x1="0" x2="1">
          <stop stopColor="rgb(var(--cyan))" />
          <stop offset="0.6" stopColor="rgb(var(--violet))" />
          <stop offset="1" stopColor="rgb(var(--gold))" />
        </linearGradient>
      </defs>
      <g stroke="url(#corner-mesh)" strokeWidth="1">
        <path d="M30 40 L90 20 L150 45 L200 30 M30 40 L60 110 L90 20 M60 110 L150 45 L130 120 L200 30 M60 110 L40 180 L130 120 L170 190 L200 120 L130 120 M170 190 L200 30" />
      </g>
      <g fill="rgb(var(--cyan))"><circle cx="30" cy="40" r="3" /><circle cx="90" cy="20" r="3" /><circle cx="60" cy="110" r="3" /></g>
      <g fill="rgb(var(--violet))"><circle cx="150" cy="45" r="3" /><circle cx="130" cy="120" r="4" /><circle cx="40" cy="180" r="3" /></g>
      <g fill="rgb(var(--gold))"><circle cx="200" cy="30" r="3" /><circle cx="200" cy="120" r="5" /><circle cx="170" cy="190" r="3" /></g>
    </svg>
  );
}

export default CornerMesh;
