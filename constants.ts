
import { UserRole, UserPosition } from './types';

// The Logo URL provided in the prompt
export const LOGO_URL = "https://scontent.fceb6-3.fna.fbcdn.net/v/t1.15752-9/529012134_1292736215545866_5619300273340181245_n.jpg?stp=dst-jpg_s";

export const APP_NAME = "Mandirigmang Filipino 1SF";

// Role-based permissions (for system access control)
export const PERMISSIONS = {
  CAN_MANAGE_USERS: [UserRole.ADMIN],
  CAN_VIEW_LOGS: [UserRole.ADMIN],
  CAN_TAKE_ATTENDANCE: [UserRole.ADMIN],
  CAN_MANAGE_FINANCE: [UserRole.ADMIN],
  CAN_POST_ANNOUNCEMENTS: [UserRole.ADMIN],
  CAN_EDIT_SCHEDULE: [UserRole.ADMIN],
  CAN_MANAGE_PUBLIC: [UserRole.ADMIN],
};

// Position-based permissions (for class officer duties)
export const POSITION_PERMISSIONS = {
  CAN_MANAGE_MEMBERS: [UserPosition.MAYOR, UserPosition.MARSHALL],
  CAN_TAKE_ATTENDANCE: [UserPosition.SECRETARY, UserPosition.ASST_SECRETARY, UserPosition.MAYOR],
  CAN_MANAGE_FINANCE: [UserPosition.TREASURER, UserPosition.AUDITOR, UserPosition.MAYOR],
  CAN_POST_ANNOUNCEMENTS: [UserPosition.EXT_PIO, UserPosition.INT_PIO, UserPosition.MAYOR, UserPosition.VICE_MAYOR],
  CAN_EDIT_SCHEDULE: [UserPosition.SECRETARY, UserPosition.MAYOR],
  CAN_MANAGE_PUBLIC: [UserPosition.MAYOR, UserPosition.EXT_PIO, UserPosition.INT_PIO],
};

// Check if user has permission (either by role or position)
export const hasPermission = (
  userRole: UserRole, 
  userPosition: UserPosition | undefined, 
  rolePerms: UserRole[], 
  positionPerms?: UserPosition[]
): boolean => {
  if (rolePerms.includes(userRole)) return true;
  if (positionPerms && userPosition && positionPerms.includes(userPosition)) return true;
  return false;
};

export const MOCK_SCHEDULE = [
  { id: '1', subject: 'Filipino 1', day: 'Monday', startTime: '08:00', endTime: '09:30', isMakeup: false },
  { id: '2', subject: 'Komunikasyon', day: 'Monday', startTime: '10:00', endTime: '11:30', isMakeup: false },
  { id: '3', subject: 'Kasaysayan', day: 'Tuesday', startTime: '09:00', endTime: '10:30', isMakeup: false },
  { id: '4', subject: 'Retorika', day: 'Wednesday', startTime: '13:00', endTime: '14:30', isMakeup: true },
];