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
  label: string;
  permissionKey: PortalPermissionKey;
  url: string;
  videoUrl: string;
  glow: string;
  x: number;
  y: number;
  size: number;
}

// Pixel-mapped against the current portal-solar-system-bg.mp4 artwork.
// x/y values are percentages of the rendered artwork. Size is vmin hotspot diameter.
export const PORTALS: PortalDef[] = [
  { id: 'leadership', label: 'Leadership', permissionKey: 'leadership', url: '', videoUrl: '', glow: '#ffd35c', x: 13.6, y: 55.8, size: 21.2 },
  { id: 'exam_qa', label: 'ExamQA', permissionKey: 'exam_qa', url: '', videoUrl: '', glow: '#ffcf8d', x: 33.4, y: 37.8, size: 9.7 },
  { id: 'scheduling', label: 'Scheduling', permissionKey: 'scheduling', url: '', videoUrl: '', glow: '#ff704d', x: 54.2, y: 37.2, size: 10.6 },
  { id: 'harvesting', label: 'Harvesting', permissionKey: 'harvesting', url: '', videoUrl: '', glow: '#67a7ff', x: 41.2, y: 52.6, size: 10.6 },
  { id: 'sme', label: 'SME', permissionKey: 'sme', url: '', videoUrl: '', glow: '#d66cff', x: 32.9, y: 70.4, size: 10.2 },
  { id: 'operations', label: 'Operations', permissionKey: 'operations', url: '', videoUrl: '', glow: '#b061ff', x: 54.9, y: 69.9, size: 18.3 },
  { id: 'new', label: 'New', permissionKey: 'new', url: '', videoUrl: '', glow: '#5f8cff', x: 72.2, y: 43.6, size: 14.8 },
  { id: 'network', label: 'Network', permissionKey: 'network', url: '', videoUrl: '', glow: '#9ef7ff', x: 79.6, y: 66.9, size: 13.1 },
  { id: 'shared', label: 'Shared', permissionKey: 'shared', url: '', videoUrl: '', glow: '#29a8ff', x: 88.2, y: 43.0, size: 10.2 },
  { id: 'admin', label: 'Admin', permissionKey: 'admin', url: '', videoUrl: '', glow: '#ad86ff', x: 94.4, y: 68.9, size: 9.0 },
];

export const STORAGE_KEY = 'occu_med_planet_routes_v2';
export const OPENING_VIDEO_KEY = 'occu_med_opening_video_url';
