// Uploaded images. Shared so the browser resizes to the same limits the API enforces.

export const MEDIA_KINDS = ['logo', 'hero', 'gallery', 'service', 'staff'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface SiteImage {
  id: string;
  /** Same-origin path, e.g. /media/0190…; served from every host. */
  url: string;
  width: number | null;
  height: number | null;
}

export interface MediaRule {
  label: string;
  /** Longest edge after the browser resizes it. */
  maxEdge: number;
  /** Aspect the templates crop to, as width / height (null: shown as uploaded). */
  aspect: number | null;
  /** Owner-facing advice next to the upload. */
  guidance: string;
}

export const MEDIA_RULES: Record<MediaKind, MediaRule> = {
  logo: { label: 'Logo', maxEdge: 512, aspect: 1, guidance: 'Square works best, at least 256 × 256 px. PNG keeps a transparent background.' },
  hero: { label: 'Cover photo', maxEdge: 2000, aspect: 16 / 10, guidance: 'Landscape, at least 1600 px wide. Keep faces away from the edges; templates crop differently.' },
  gallery: { label: 'Gallery photo', maxEdge: 1600, aspect: null, guidance: 'Your space, your work, your team. Any shape, at least 1000 px on the long side.' },
  service: { label: 'Service photo', maxEdge: 1200, aspect: 4 / 5, guidance: 'Portrait 4:5 suits most templates, at least 800 px tall.' },
  staff: { label: 'Team photo', maxEdge: 800, aspect: 1, guidance: 'A friendly head-and-shoulders shot, square, at least 400 px.' },
};

/** Largest file the API stores, after the browser has resized and re-encoded it. */
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
/** Largest original we try to resize in the browser. */
export const MEDIA_MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const MEDIA_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export const GALLERY_MAX = 12;
