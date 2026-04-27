// ─── Single source of truth for all planet portals ───────────────────────────

export type PortalPermissionKey =
  | 'leadership'
  | 'exam_qa'
  | 'scheduling'
  | 'harvesting'
  | 'sme'
  | 'operations'
  | 'new'
  | 'network'
  | 'shared'
  | 'admin';

export interface PortalDef {
  id: PortalPermissionKey;
  label: string;            // label shown ON the planet
  permissionKey: PortalPermissionKey;
  url: string;              // render link (set via Admin panel / Pluto click)
  videoUrl: string;         // per-planet transition video URL
  glow: string;             // bloom / glow colour
  x: number;                // % left  (matched to solar system artwork)
  y: number;                // % top
  size: number;             // vmin — diameter of clickable hotspot
}

// ─── Planet positions carefully mapped to the solar system artwork ────────────
// Image is landscape 16:9. All x/y are % of container width/height.
//
//  Sun       – far left, large golden star
//  Mercury   – upper area, small tan/orange planet
//  Venus     – top center, bright red/orange planet
//  Earth     – blue/green planet, mid-left cluster
//  Mars      – purple planet, lower-left cluster
//  Jupiter   – huge striped planet, bottom-center
//  Saturn    – ringed planet, right of center
//  Uranus    – teal planet, lower-right
//  Neptune   – blue planet, upper-right
//  Pluto     – tiny purple, far right edge

export const PORTALS: PortalDef[] = [
  { id: 'leadership', label: 'Leadership', permissionKey: 'leadership', url: '', videoUrl: '', glow: '#ffb54b', x: 13,   y: 50,   size: 20  },
  { id: 'exam_qa',    label: 'ExamQA',     permissionKey: 'exam_qa',    url: '', videoUrl: '', glow: '#ffcf8d', x: 30,   y: 32,   size: 9   },
  { id: 'scheduling', label: 'Scheduling', permissionKey: 'scheduling', url: '', videoUrl: '', glow: '#ff6e4f', x: 50,   y: 24,   size: 11  },
  { id: 'harvesting', label: 'Harvesting', permissionKey: 'harvesting', url: '', videoUrl: '', glow: '#74a9ff', x: 36,   y: 55,   size: 9.5 },
  { id: 'sme',        label: 'SME',        permissionKey: 'sme',        url: '', videoUrl: '', glow: '#c86cff', x: 29,   y: 72,   size: 8.5 },
  { id: 'operations', label: 'Operations', permissionKey: 'operations', url: '', videoUrl: '', glow: '#a56dff', x: 52,   y: 68,   size: 18  },
  { id: 'new',        label: 'New',        permissionKey: 'new',        url: '', videoUrl: '', glow: '#7ea2ff', x: 70,   y: 38,   size: 14  },
  { id: 'network',    label: 'Network',    permissionKey: 'network',    url: '', videoUrl: '', glow: '#9ef7ff', x: 80,   y: 65,   size: 12  },
  { id: 'shared',     label: 'Shared',     permissionKey: 'shared',     url: '', videoUrl: '', glow: '#5d93ff', x: 87,   y: 36,   size: 9   },
  { id: 'admin',      label: 'Admin',      permissionKey: 'admin',      url: '', videoUrl: '', glow: '#ad86ff', x: 95.5, y: 65,   size: 7   },
];

export const STORAGE_KEY = 'occu_med_planet_routes_v2';
export const OPENING_VIDEO_KEY = 'occu_med_opening_video_url';
