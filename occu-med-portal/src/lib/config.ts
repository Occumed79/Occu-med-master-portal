export type PortalPermissionKey =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
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

export const PORTALS: PortalDef[] = [
  { id: 'sun', label: 'Leadership', permissionKey: 'sun', url: '', videoUrl: '', glow: '#ffb54b', x: 12, y: 49, size: 22.5 },
  { id: 'mercury', label: 'ExamQA', permissionKey: 'mercury', url: '', videoUrl: '', glow: '#ffad8d', x: 34.5, y: 38.5, size: 10 },
  { id: 'venus', label: 'Scheduling', permissionKey: 'venus', url: '', videoUrl: '', glow: '#ff6e4f', x: 52, y: 35.6, size: 11 },
  { id: 'earth', label: 'Harvesting', permissionKey: 'earth', url: '', videoUrl: '', glow: '#74a9ff', x: 39.8, y: 52.7, size: 10.8 },
  { id: 'mars', label: 'SME', permissionKey: 'mars', url: '', videoUrl: '', glow: '#c86cff', x: 34.3, y: 67.5, size: 9.1 },
  { id: 'jupiter', label: 'Operations', permissionKey: 'jupiter', url: '', videoUrl: '', glow: '#a56dff', x: 53.5, y: 70.3, size: 19 },
  { id: 'saturn', label: 'New', permissionKey: 'saturn', url: '', videoUrl: '', glow: '#7ea2ff', x: 68.7, y: 44, size: 14.5 },
  { id: 'uranus', label: 'Network', permissionKey: 'uranus', url: '', videoUrl: '', glow: '#9ef7ff', x: 81.5, y: 66.8, size: 14 },
  { id: 'neptune', label: 'Shared', permissionKey: 'neptune', url: '', videoUrl: '', glow: '#5d93ff', x: 86.4, y: 44.5, size: 10.8 },
  { id: 'admin', label: 'Admin', permissionKey: 'admin', url: '', videoUrl: '', glow: '#ad86ff', x: 96, y: 66.2, size: 9.3 },
];

export const STORAGE_KEY = 'occu_med_planet_routes_v1';
export const OPENING_VIDEO_KEY = 'occu_med_opening_video_v1';
