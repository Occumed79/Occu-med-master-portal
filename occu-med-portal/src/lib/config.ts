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

const CDN = 'https://res.cloudinary.com/dhsvsnnec/video/upload';

export const PORTALS: PortalDef[] = [
  { id: 'leadership', label: 'Leadership',  permissionKey: 'leadership',  url: '', videoUrl: `${CDN}/Portal_Selection_bxdssg.mp4`, glow: '#ffd35c', x: 12.6, y: 50.4, size: 19.8 },
  { id: 'exam_qa',    label: 'ExamQA',      permissionKey: 'exam_qa',     url: '', videoUrl: `${CDN}/Venus_ynn6wf.mp4`,            glow: '#ffcf8d', x: 29.2, y: 31.1, size: 10.5 },
  { id: 'scheduling', label: 'Scheduling',  permissionKey: 'scheduling',  url: '', videoUrl: `${CDN}/mars_zsvc4p.mp4`,             glow: '#ff704d', x: 50.9, y: 29.1, size: 12.7 },
  { id: 'harvesting', label: 'Harvesting',  permissionKey: 'harvesting',  url: '', videoUrl: `${CDN}/Earth_pfhmkt.mp4`,            glow: '#67a7ff', x: 37.2, y: 51.1, size: 11.4 },
  { id: 'sme',        label: 'SME',         permissionKey: 'sme',         url: '', videoUrl: `${CDN}/Mercury_uqeksu.mp4`,          glow: '#d66cff', x: 31.2, y: 67.3, size: 10.4 },
  { id: 'operations', label: 'Operations',  permissionKey: 'operations',  url: '', videoUrl: `${CDN}/Jupiter_trtqcp.mp4`,          glow: '#b061ff', x: 51.6, y: 69.8, size: 19.0 },
  { id: 'new',        label: 'New',         permissionKey: 'new',         url: '', videoUrl: `${CDN}/Saturn_gmbfcs.mp4`,           glow: '#5f8cff', x: 69.3, y: 39.0, size: 15.4 },
  { id: 'network',    label: 'Network',     permissionKey: 'network',     url: '', videoUrl: `${CDN}/Uranus_v740g4.mp4`,           glow: '#9ef7ff', x: 77.9, y: 66.6, size: 14.3 },
  { id: 'shared',     label: 'Shared',      permissionKey: 'shared',      url: '', videoUrl: `${CDN}/Neptune_oicm3o.mp4`,          glow: '#29a8ff', x: 86.7, y: 36.5, size: 10.8 },
  { id: 'admin',      label: 'Admin',       permissionKey: 'admin',       url: '', videoUrl: `${CDN}/Pluto_p7rok3.mp4`,            glow: '#ad86ff', x: 96,   y: 66.2, size: 9.3  },
];

export const STORAGE_KEY = 'occu_med_planet_routes_v1';
export const OPENING_VIDEO_KEY = 'occu_med_opening_video_v1';
export const AUDIO_KEY = 'occu_med_startup_audio_url_v1';
