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

export const PORTALS: PortalDef[] = [
  { id: 'leadership', label: 'Leadership', permissionKey: 'leadership', url: '', videoUrl: '', glow: '#ffd35c', x: 12.6, y: 50.4, size: 19.8 },
  { id: 'exam_qa', label: 'ExamQA', permissionKey: 'exam_qa', url: '', videoUrl: '', glow: '#ffcf8d', x: 29.2, y: 31.1, size: 10.5 },
  { id: 'scheduling', label: 'Scheduling', permissionKey: 'scheduling', url: '', videoUrl: '', glow: '#ff704d', x: 50.9, y: 29.1, size: 12.7 },
  { id: 'harvesting', label: 'Harvesting', permissionKey: 'harvesting', url: '', videoUrl: '', glow: '#67a7ff', x: 37.2, y: 51.1, size: 11.4 },
  { id: 'sme', label: 'SME', permissionKey: 'sme', url: '', videoUrl: '', glow: '#d66cff', x: 31.2, y: 67.3, size: 10.4 },
  { id: 'operations', label: 'Operations', permissionKey: 'operations', url: '', videoUrl: '', glow: '#b061ff', x: 51.6, y: 69.8, size: 19.0 },
  { id: 'new', label: 'New', permissionKey: 'new', url: '', videoUrl: '', glow: '#5f8cff', x: 69.3, y: 39.0, size: 15.4 },
  { id: 'network', label: 'Network', permissionKey: 'network', url: '', videoUrl: '', glow: '#9ef7ff', x: 77.9, y: 66.6, size: 14.3 },
  { id: 'shared', label: 'Shared', permissionKey: 'shared', url: '', videoUrl: '', glow: '#29a8ff', x: 86.7, y: 36.5, size: 10.8 },
  { id: 'admin', label: 'Admin', permissionKey: 'admin', url: '', videoUrl: '', glow: '#ad86ff', x: 96, y: 66.2, size: 9.3 },
];

export const STORAGE_KEY = 'occu_med_planet_routes_v1';
export const OPENING_VIDEO_KEY = 'occu_med_opening_video_v1';
