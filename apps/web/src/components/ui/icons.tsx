type IconProps = {
  className?: string;
};

export function IconOverview({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 12.5 12 4l8 8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5V19h11v-8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconProjects({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 5V3.8M16 5V3.8M4 10h16" strokeLinecap="round" />
    </svg>
  );
}

export function IconTasks({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M9 7h9M9 12h9M9 17h9" strokeLinecap="round" />
      <path d="M5 7.5 6.2 8.8 8.5 6.5M5 12.5 6.2 13.8 8.5 11.5M5 17.5 6.2 18.8 8.5 16.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTeams({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 18.5a5 5 0 0 1 10 0M10.5 18.5a5 5 0 0 1 10 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19 12a7.3 7.3 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-1.8-1.1L14.2 3h-4.4l-.5 2.9a7.6 7.6 0 0 0-1.8 1.1l-2.4-1-2 3.4 2 1.5A7.3 7.3 0 0 0 5 12c0 .38.03.75.1 1.1l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 1.8 1.1l.5 2.9h4.4l.5-2.9a7.6 7.6 0 0 0 1.8-1.1l2.4 1 2-3.4-2-1.5c.07-.35.1-.72.1-1.1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M9 18h6M6.5 17.5V11a5.5 5.5 0 1 1 11 0v6.5H6.5ZM10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
