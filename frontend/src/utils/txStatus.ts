export const formatDurationMinutes = (durationMs: number): string => {
  const minutes = Math.ceil(durationMs / 60_000);
  return `${Math.max(minutes, 1)} min`;
};

export const formatUnixSeconds = (unixSeconds?: number | null): string | null => {
  if (!unixSeconds || Number.isNaN(unixSeconds)) {
    return null;
  }

  return new Date(unixSeconds * 1000).toLocaleTimeString();
};

