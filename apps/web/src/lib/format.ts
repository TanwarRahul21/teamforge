export function formatDateTime(value: string, locale = "en-US", timeZone = "UTC") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatShortDate(value: string, locale = "en-US", timeZone = "UTC") {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(value));
}

export function formatRelativeTime(value: string, locale = "en-US", timeZone = "UTC") {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `${Math.max(diffHours, 1)}h ago`;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}
