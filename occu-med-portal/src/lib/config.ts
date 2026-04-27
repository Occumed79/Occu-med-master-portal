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
  label: string;         // label shown ON the planet
  permissionKey: PortalPermissionKey;
  url: string;           // render link (editable from Admin / Pluto click)
  videoUrl: string;      // per-planet transition video URL
  glow: string;          // bloom / glow colour
  x: number;             // % left  (matches solar system artwork)
  y: number;             // % top
  size: number;          // vmin radius
}

export const PORTALS: PortalDef[] = [
  { id: 'leadership', label: 'Leadership', permissionKey: 'leadership', url: '', videoUrl: '', glow: '#ffb54b', x: 12,   y: 49,   size: 22.5 },
  { id: 'exam_qa',    label: 'ExamQA',     permissionKey: 'exam_qa',    url: '', videoUrl: '', glow: '#ffad8d', x: 34.5, y: 38.5, size: 10   },
  { id: 'scheduling', label: 'Scheduling', permissionKey: 'scheduling', url: '', videoUrl: '', glow: '#ff6e4f', x: 52,   y: 35.6, size: 11   },
  { id: 'harvesting', label: 'Harvesting', permissionKey: 'harvesting', url: '', videoUrl: '', glow: '#74a9ff', x: 39.8, y: 52.7, size: 10.8 },
  { id: 'sme',        label: 'SME',        permissionKey: 'sme',        url: '', videoUrl: '', glow: '#c86cff', x: 34.3, y: 67.5, size: 9.1  },
  { id: 'operations', label: 'Operations', permissionKey: 'operations', url: '', videoUrl: '', glow: '#a56dff', x: 53.5, y: 70.3, size: 19   },
  { id: 'new',        label: 'New',        permissionKey: 'new',        url: '', videoUrl: '', glow: '#7ea2ff', x: 68.7, y: 44,   size: 14.5 },
  { id: 'network',    label: 'Network',    permissionKey: 'network',    url: '', videoUrl: '', glow: '#9ef7ff', x: 81.5, y: 66.8, size: 14   },
  { id: 'shared',     label: 'Shared',     permissionKey: 'shared',     url: '', videoUrl: '', glow: '#5d93ff', x: 86.4, y: 44.5, size: 10.8 },
  { id: 'admin',      label: 'Admin',      permissionKey: 'admin',      url: '', videoUrl: '', glow: '#ad86ff', x: 96,   y: 66.2, size: 9.3  },
];

export const STORAGE_KEY = 'occu_med_planet_routes_v2';
export const OPENING_VIDEO_KEY = 'occu_med_opening_video_url';
