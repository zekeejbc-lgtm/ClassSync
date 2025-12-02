
export enum UserRole {
  ADMIN = 'Admin',
  MAYOR = 'Mayor',
  VICE_MAYOR = 'Vice Mayor',
  SECRETARY = 'Secretary',
  ASST_SECRETARY = 'Assistant Secretary',
  TREASURER = 'Treasurer',
  AUDITOR = 'Auditor',
  EXT_PIO = 'External P.I.O',
  INT_PIO = 'Internal P.I.O',
  MARSHALL = 'Marshall',
  STUDENT = 'Student',
  SUSPENDED = 'Suspended',
  GUEST = 'Guest'
}

export interface User {
  id: string; // The specific ID Code (e.g., 1SF-2025-00046)
  studentId?: string; // Original student ID (e.g., 2025-00046)
  username: string;
  email: string; // University email
  role: UserRole;
  fullName: string;
  status: 'active' | 'suspended';
  avatar?: string;
  avatarFileId?: string; // Google Drive file ID for the avatar
  bio?: string;
  contactNumber?: string;
  personalEmail?: string;
  socialLinks?: { id: string; url: string; platform: string }[];
  
  // Location
  province?: string;
  city?: string;
  barangay?: string;
  purokHouseNumber?: string;
  
  // School Info
  school?: string;
  college?: string;
  program?: string;
  major?: string;
  yearLevel?: string;
  section?: string;
  
  // Emergency Contact
  emergencyPerson?: string;
  emergencyContact?: string;
  
  // Registration info
  registeredAt?: number;
  verifiedEmail?: boolean;
}

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type TodoCategory = 'HOMEWORK' | 'PROJECT' | 'EXAM' | 'ACTIVITY' | 'OTHER';

export interface ToDoItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  type: 'SHARED' | 'PERSONAL';
  createdBy: string; // User ID
  assignee?: string; // If personal
  createdAt: number;
  deadline?: number; // Timestamp
  priority: PriorityLevel;
  dependencies?: string[]; // IDs of tasks that must be completed first
  category: TodoCategory;
  subject?: string; // e.g. "Filipino 1", "Mathematics"
}

export interface Campaign {
    id: string;
    title: string;
    description: string;
    targetAmount: number;
    amountPerStudent: number;
    letterUrl?: string; // Proof/Auth letter
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    createdBy: string;
    dateCreated: number;
}

export interface Transaction {
  id: string;
  type: 'COLLECTION' | 'EXPENSE';
  amount: number;
  category: string;
  description: string;
  date: number;
  recordedBy: string; // User ID (Treasurer/Auditor)
  verified: boolean; // For Audit
  campaignId?: string; // Optional linkage
  studentId?: string; // If collection from specific student
  proofUrl?: string; // For Expenses/Liquidation
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM
  studentId: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  recordedBy: string;
  proofUrl?: string; // For Excused
  remarks?: string;
}

export interface ExcuseRequest {
    id: string;
    studentId: string;
    reason: string;
    validationContact?: string; // Parent/Guardian/Doctor (Optional)
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    startTime?: string; // HH:MM (Optional, for specific time requests)
    endTime?: string; // HH:MM
    type: 'DATE_SPAN' | 'SPECIFIC_TIME';
    proofUrl?: string; // Image/File
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    dateFiled: number;
}

export interface AttendanceComplaint {
    id: string;
    recordId: string;
    studentId: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    dateFiled: number;
}

export interface AccessLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  details: string;
}

export type AnnouncementCategory = 'GENERAL' | 'URGENT' | 'EVENT' | 'ACADEMIC' | 'FINANCE';

export interface Announcement {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  authorId: string;
  date: number;
  isEmailSent: boolean;
  category: AnnouncementCategory;
  attachmentUrl?: string;
}

export interface ClassSchedule {
  id: string;
  subject: string;
  day: string; // Monday, Tuesday, etc.
  startTime: string;
  endTime: string;
  isMakeup: boolean;
  room?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'PDF' | 'LINK' | 'DOC' | 'IMAGE';
  url: string;
  description?: string;
  dateAdded: number;
}

export interface Grade {
  id: string;
  subject: string;
  quarter: '1st' | '2nd' | '3rd' | '4th';
  score: number; // 0-100
  weight: number; // Percentage
  type: 'WRITTEN' | 'PERFORMANCE' | 'EXAM';
  date: string;
}

export interface ClassSettings {
    logoUrl: string;
    className: string;
    academicYear: string;
}

export interface AlbumImage {
    id: string;
    url: string;
    caption: string;
    date: number;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    date: string;
    icon: string; // emoji or icon name
}

export interface Feedback {
    id: string;
    name: string;
    message: string;
    date: number;
    isRead: boolean;
}

export interface JournalEntry {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    title: string;
    content: string;
    lessons: string; // Key lessons learned
    mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
    tags?: string[];
    createdAt: number;
    updatedAt: number;
}

// ==================== APPLICATION SYSTEM ====================

export type ApplicationStatus = 'pending' | 'verifying' | 'approved' | 'rejected';

export interface RegistrationApplication {
    id: string;
    studentId: string;
    universityEmail: string;
    fullName: string;
    username: string;
    password: string; // Hashed in production
    contactNumber: string;
    personalEmail?: string;
    avatar?: string;
    avatarFileId?: string;
    socialLinks?: { id: string; url: string; platform: string }[];
    
    // Location
    province: string;
    city: string;
    barangay: string;
    purokHouseNumber?: string;
    
    // School Info
    school: string;
    college: string;
    program: string;
    major?: string;
    yearLevel: string;
    section: string;
    
    // Emergency Contact
    emergencyPerson: string;
    emergencyContact: string;
    
    // Application metadata
    status: ApplicationStatus;
    submittedAt: number;
    reviewedAt?: number;
    reviewedBy?: string;
    reviewNotes?: string;
    rejectionReason?: string;
}
