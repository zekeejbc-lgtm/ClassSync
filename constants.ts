
import { UserRole } from './types';

// The Logo URL provided in the prompt
export const LOGO_URL = "https://scontent.fceb6-3.fna.fbcdn.net/v/t1.15752-9/529012134_1292736215545866_5619300273340181245_n.jpg?stp=dst-jpg_s";

export const APP_NAME = "Mandirigmang Filipino 1SF";

export const PERMISSIONS = {
  CAN_MANAGE_USERS: [UserRole.ADMIN, UserRole.MAYOR, UserRole.MARSHALL],
  CAN_VIEW_LOGS: [UserRole.ADMIN],
  CAN_TAKE_ATTENDANCE: [UserRole.ADMIN, UserRole.SECRETARY, UserRole.ASST_SECRETARY, UserRole.MAYOR],
  CAN_MANAGE_FINANCE: [UserRole.ADMIN, UserRole.TREASURER, UserRole.AUDITOR, UserRole.MAYOR],
  CAN_POST_ANNOUNCEMENTS: [UserRole.ADMIN, UserRole.EXT_PIO, UserRole.INT_PIO, UserRole.MAYOR, UserRole.VICE_MAYOR],
  CAN_EDIT_SCHEDULE: [UserRole.ADMIN, UserRole.SECRETARY, UserRole.MAYOR],
  CAN_MANAGE_PUBLIC: [UserRole.ADMIN, UserRole.MAYOR, UserRole.EXT_PIO, UserRole.INT_PIO],
};

export const MOCK_SCHEDULE = [
  { id: '1', subject: 'Filipino 1', day: 'Monday', startTime: '08:00', endTime: '09:30', isMakeup: false },
  { id: '2', subject: 'Komunikasyon', day: 'Monday', startTime: '10:00', endTime: '11:30', isMakeup: false },
  { id: '3', subject: 'Kasaysayan', day: 'Tuesday', startTime: '09:00', endTime: '10:30', isMakeup: false },
  { id: '4', subject: 'Retorika', day: 'Wednesday', startTime: '13:00', endTime: '14:30', isMakeup: true },
];