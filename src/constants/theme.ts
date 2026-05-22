// AINO brand palette — derived from the Group.svg logo
// Navy blue (A-monogram left)  · Burgundy (N/P-monogram right)

export const BRAND = {
  // ── Primary logo colors ────────────────────────────────────────────────────
  navy:    '#1e3c6e',   // deep navy — A/I monogram
  maroon:  '#7a2030',   // deep burgundy — N/P monogram
  red:     '#c41e1e',   // brand red — "AINO" logotype text

  // ── Role accents ───────────────────────────────────────────────────────────
  admin:   '#1e3c6e',   // admin → navy
  agent:   '#1e3c6e',   // agent → navy
  owner:   '#7a2030',   // owner → maroon

  // ── UI neutrals ───────────────────────────────────────────────────────────
  dark:    '#0a0f1c',
  bg:      '#f5f7fa',
  white:   '#ffffff',
  muted:   '#94a3b8',
  border:  '#e2e8f0',
  surface: '#f8fafc',

  // ── Semantic / status (keep distinct from brand) ───────────────────────────
  available: '#16a34a',
  booked:    '#f59e0b',
  sold:      '#94a3b8',
  error:     '#ef4444',
  amber:     '#f59e0b',
} as const;

export type BrandKey = keyof typeof BRAND;
