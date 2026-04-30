/** Returns up to 2 uppercase initials from a full name (e.g. "Priya Mehta" → "PM"). */
export function getInitials(name: string): string {
  return (name || '??')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
