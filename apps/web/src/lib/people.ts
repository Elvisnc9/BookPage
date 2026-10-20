/** Initials and a stable colour (0–4) for a customer avatar, so the same person always looks the same. */
export function avatarFor(name: string): { initials: string; hue: number } {
  const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { initials, hue: h % 5 };
}
