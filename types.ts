
export enum UserRole {
  ADMIN = 'Admin',
  STUDENT = 'Student',
  GUEST = 'Guest',
  SUSPENDED = 'Suspended',
  BANNED = 'Banned'
}

export enum UserPosition {
  NONE = 'None',
  MAYOR = 'Mayor',
  VICE_MAYOR = 'Vice Mayor',
  SECRETARY = 'Secretary',
  ASST_SECRETARY = 'Assistant Secretary',
  TREASURER = 'Treasurer',
  AUDITOR = 'Auditor',
  EXT_PIO = 'External P.I.O',
  INT_PIO = 'Internal P.I.O',
  MARSHALL = 'Marshall'
}

export interface User {
  id: string; // The specific ID Code (e.g., 1SF-2025-00046)
  studentId?: string; // Original student ID (e.g., 2025-00046)
  username: string;
  email: string; // University email
  role: UserRole;
  position?: UserPosition; // Class position/office
  fullName: string;
  status: 'active' | 'suspended' | 'banned';
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
  
  // School Info (legacy string fields for backward compatibility)
  school?: string;
  college?: string;
  program?: string;
  major?: string;
  yearLevel?: string;
  section?: string;
  
  // School Structure References (new - IDs linking to school structure)
  schoolId?: string;
  departmentId?: string;
  collegeId?: string;
  programId?: string;
  majorId?: string;
  trackId?: string;
  strandId?: string;
  yearLevelId?: string;
  sectionId?: string;
  
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
    maxApplicationAttempts?: number; // Max times a rejected applicant can reapply (default: 5)
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

// Field verification status for each verifiable field
export interface FieldVerification {
    verified: boolean;
    verifiedAt?: number;
    verifiedBy?: string;
    issue?: string; // Reason why field is not verified
}

// All verifiable fields in an application
export interface ApplicationFieldVerifications {
    studentId?: FieldVerification;
    universityEmail?: FieldVerification;
    fullName?: FieldVerification;
    avatar?: FieldVerification;
    contactNumber?: FieldVerification;
    province?: FieldVerification;
    city?: FieldVerification;
    barangay?: FieldVerification;
    school?: FieldVerification;
    college?: FieldVerification;
    program?: FieldVerification;
    major?: FieldVerification;
    section?: FieldVerification;
    emergencyPerson?: FieldVerification;
    emergencyContact?: FieldVerification;
}

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
    
    // Field-level verification
    fieldVerifications?: ApplicationFieldVerifications;
    
    // Tracks which fields need correction (set when admin marks issues)
    fieldsNeedingCorrection?: string[];
    
    // Last resubmission timestamp
    resubmittedAt?: number;
    
    // Application attempt tracking (for retry/resubmission)
    attemptNumber?: number;

    // School structure references (new)
    schoolId?: string;
    departmentId?: string;
    collegeId?: string;
    programId?: string;
    majorId?: string;
    yearLevelId?: string;
    sectionId?: string;
}

// ==========================================
// SCHOOL STRUCTURE TYPES
// ==========================================

export type DepartmentType = 'TERTIARY' | 'SENIOR_HIGH' | 'JUNIOR_HIGH';
export type SeniorHighTrack = 'ACADEMIC' | 'TVL' | 'SPORTS' | 'ARTS_DESIGN';

export interface SocialMediaLink {
    id: string;
    platform: string;
    url: string;
}

export interface School {
    id: string;
    name: string;
    address: string;
    logoUrl?: string;
    googleMapUrl?: string;
    contactNumber?: string;
    socialLinks?: SocialMediaLink[];
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

export interface Department {
    id: string;
    schoolId: string;
    type: DepartmentType;
    name: string; // e.g., "Tertiary/College", "Senior High School", "Junior High School"
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

// For Tertiary/College
export interface College {
    id: string;
    departmentId: string;
    schoolId: string;
    name: string; // e.g., "College of Teacher Education and Technology"
    abbreviation?: string; // e.g., "CTET"
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

export interface Program {
    id: string;
    collegeId: string;
    departmentId: string;
    schoolId: string;
    name: string; // e.g., "Bachelor of Secondary Education"
    abbreviation?: string; // e.g., "BSEd"
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

export interface Major {
    id: string;
    programId: string;
    collegeId: string;
    departmentId: string;
    schoolId: string;
    name: string; // e.g., "English", "Mathematics", "Filipino"
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

// For Senior High School
export interface Track {
    id: string;
    departmentId: string;
    schoolId: string;
    type: SeniorHighTrack;
    name: string; // e.g., "Academic Track", "TVL Track"
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

export interface Strand {
    id: string;
    trackId: string;
    departmentId: string;
    schoolId: string;
    name: string; // e.g., "STEM", "ABM", "HUMSS", "GAS"
    fullName?: string; // e.g., "Science, Technology, Engineering and Mathematics"
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

// Year Level (shared between Tertiary, SHS, JHS)
export interface YearLevel {
    id: string;
    // Parent references (one of these will be set based on department type)
    majorId?: string; // For Tertiary (optional, can be under program directly)
    programId?: string; // For Tertiary without major
    strandId?: string; // For Senior High
    departmentId: string; // For Junior High (directly under department)
    schoolId: string;
    
    name: string; // e.g., "1st Year", "2nd Year", "Grade 11", "Grade 7"
    order: number; // For sorting (1, 2, 3, 4 or 7, 8, 9, 10 or 11, 12)
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

// Section (final level)
export interface Section {
    id: string;
    yearLevelId: string;
    // Inherit parent references for easy lookup
    majorId?: string;
    programId?: string;
    collegeId?: string;
    strandId?: string;
    trackId?: string;
    departmentId: string;
    schoolId: string;
    
    name: string; // e.g., "1SF", "Section A", "Einstein"
    adviser?: string; // User ID of the section adviser
    createdAt: number;
    createdBy: string;
    isActive: boolean;
}

// For navigation breadcrumb display
export interface SchoolBreadcrumb {
    school?: School;
    department?: Department;
    college?: College;
    track?: Track;
    program?: Program;
    strand?: Strand;
    major?: Major;
    yearLevel?: YearLevel;
    section?: Section;
}
