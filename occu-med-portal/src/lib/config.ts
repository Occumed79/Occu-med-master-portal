export type PortalPermissionKey =
  | 'executive'
  | 'operations'
  | 'network'
  | 'admin'
  | 'pr'
  | 'exam_qa'
  | 'advancement';

export interface PortalDef {
  id: string;
  label: string;
  permissionKey: PortalPermissionKey;
  url: string;
  color: string;
  x: number;
  y: number;
  size: number;
}

export const PORTALS: PortalDef[] = [
  { id: 'executive', label: 'Executive', permissionKey: 'executive', url: 'https://paste-executive-render-url-here.example', color: '#ff2a00', x: 85.5, y: 22, size: 18 },
  { id: 'operations', label: 'Operations', permissionKey: 'operations', url: 'https://paste-operations-render-url-here.example', color: '#18f0ff', x: 12.5, y: 42, size: 16 },
  { id: 'network', label: 'Network', permissionKey: 'network', url: 'https://paste-network-render-url-here.example', color: '#61e7ff', x: 23.5, y: 87, size: 22 },
  { id: 'admin', label: 'SMEs', permissionKey: 'admin', url: 'https://paste-admin-render-url-here.example', color: '#ff5a1f', x: 84.5, y: 84, size: 18 },
  { id: 'pr', label: 'PR', permissionKey: 'pr', url: 'https://paste-pr-render-url-here.example', color: '#f6d38b', x: 28.5, y: 13, size: 8 },
  { id: 'exam-qa', label: 'Exam QA', permissionKey: 'exam_qa', url: 'https://paste-exam-qa-render-url-here.example', color: '#ffe600', x: 8.5, y: 11, size: 18 },
  { id: 'advancement', label: 'Advancement', permissionKey: 'advancement', url: 'https://paste-advancement-render-url-here.example', color: '#a77a2b', x: 96.5, y: 56, size: 11 },
];
