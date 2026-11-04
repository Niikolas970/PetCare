export default function Logo({ size = 40, withName = true }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="PetCare">
        <rect width="64" height="64" rx="18" fill="var(--primary)" />
        <g fill="var(--surface)">
          <circle cx="19" cy="29" r="5" />
          <circle cx="28.5" cy="19" r="5" />
          <circle cx="43" cy="19" r="5" />
          <circle cx="47" cy="30" r="5" />
          <path d="M32 33c-8 0-14 7-14 13 0 4.500 4 6.500 8 5.800 2.200-.4 4-1.300 6-1.300s3.800.9 6 1.300c4 .7 8-1.300 8-5.800 0-6-6-13-14-13Z" />
        </g>
      </svg>
      {withName && <span className="logo-name">PetCare</span>}
    </span>
  );
}
