
import { User, ToDoItem, Transaction, AttendanceRecord, AccessLog, Announcement, UserRole, Resource, Grade, ClassSchedule, ClassSettings, AlbumImage, Achievement, ExcuseRequest, AttendanceComplaint, Feedback, Campaign, JournalEntry } from '../types';
import { LOGO_URL, APP_NAME } from '../constants';
import { dbRefs, dbHelpers } from './firebase';
import { onValue } from 'firebase/database';

// Keys for LocalStorage (used as cache)
const STORAGE_KEYS = {
  USERS: 'cs_users',
  TODOS: 'cs_todos',
  TRANSACTIONS: 'cs_transactions',
  ATTENDANCE: 'cs_attendance',
  LOGS: 'cs_logs',
  ANNOUNCEMENTS: 'cs_announcements',
  CURRENT_USER: 'cs_current_user',
  SCHEDULE: 'cs_schedule',
  SETTINGS: 'cs_settings',
  ALBUM: 'cs_album',
  ACHIEVEMENTS: 'cs_achievements',
  EXCUSES: 'cs_excuses',
  COMPLAINTS: 'cs_complaints',
  FEEDBACK: 'cs_feedback',
  CAMPAIGNS: 'cs_campaigns',
  JOURNAL: 'cs_journal'
};

// --- Helper for Mock Data Initialization ---
const initData = () => {
  // Initialize empty storage - NO demo accounts
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.TODOS)) localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)) localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.EXCUSES)) localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.COMPLAINTS)) localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.FEEDBACK)) localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.JOURNAL)) localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.CAMPAIGNS)) localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify([]));
  
  // Initial Schedule - empty
  if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE)) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify([]));
  }

  // Initial Settings
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      const initialSettings: ClassSettings = {
          logoUrl: LOGO_URL,
          className: APP_NAME,
          academicYear: '2024-2025'
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
  }

  // Initial Album - empty
  if (!localStorage.getItem(STORAGE_KEYS.ALBUM)) {
      localStorage.setItem(STORAGE_KEYS.ALBUM, JSON.stringify([]));
  }

  // Initial Achievements - empty
  if (!localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify([]));
  }
};

// Export function to clear all data and reinitialize (useful for testing or reset)
export const clearAllData = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    initData();
    console.log('All data cleared and reinitialized');
};

initData();

// --- Firebase Sync ---
// Initialize Firebase data and setup real-time sync
const initFirebase = async () => {
    try {
        // Check if Firebase has data, if not sync from localStorage
        const existingUsers = await dbHelpers.getAll<User>(dbRefs.users());
        
        if (existingUsers.length === 0) {
            console.log('Syncing local data to Firebase...');
            
            // Sync users
            const localUsers = get<User>(STORAGE_KEYS.USERS);
            for (const user of localUsers) {
                await dbHelpers.setData(dbRefs.user(user.id), user);
            }
            
            // Sync announcements
            const localAnnouncements = get<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS);
            for (const ann of localAnnouncements) {
                await dbHelpers.setData(dbRefs.announcement(ann.id), ann);
            }
            
            // Sync schedule
            const localSchedule = get<ClassSchedule>(STORAGE_KEYS.SCHEDULE);
            for (const item of localSchedule) {
                await dbHelpers.setData(dbRefs.scheduleItem(item.id), item);
            }
            
            // Sync settings
            const localSettings = getOne<ClassSettings>(STORAGE_KEYS.SETTINGS);
            if (localSettings) {
                await dbHelpers.setData(dbRefs.settings(), localSettings);
            }
            
            // Sync album
            const localAlbum = get<AlbumImage>(STORAGE_KEYS.ALBUM);
            for (const img of localAlbum) {
                await dbHelpers.setData(dbRefs.albumImage(img.id), img);
            }
            
            // Sync achievements
            const localAch = get<Achievement>(STORAGE_KEYS.ACHIEVEMENTS);
            for (const ach of localAch) {
                await dbHelpers.setData(dbRefs.achievement(ach.id), ach);
            }
            
            // Sync campaigns
            const localCampaigns = get<Campaign>(STORAGE_KEYS.CAMPAIGNS);
            for (const camp of localCampaigns) {
                await dbHelpers.setData(dbRefs.campaign(camp.id), camp);
            }
            
            console.log('Local data synced to Firebase!');
        }
        
        // Setup real-time listeners to sync FROM Firebase TO localStorage
        setupFirebaseListeners();
        console.log('Firebase connected! Real-time sync enabled.');
        
    } catch (error) {
        console.error('Firebase init error:', error);
    }
};

const setupFirebaseListeners = () => {
    // Users
    onValue(dbRefs.users(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const users = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.USERS, users);
        }
    });

    // Todos
    onValue(dbRefs.todos(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const todos = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.TODOS, todos);
        }
    });

    // Transactions
    onValue(dbRefs.transactions(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const txs = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.TRANSACTIONS, txs);
        }
    });

    // Attendance
    onValue(dbRefs.attendance(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const records = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.ATTENDANCE, records);
        }
    });

    // Announcements
    onValue(dbRefs.announcements(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const announcements = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
        }
    });

    // Schedule
    onValue(dbRefs.schedule(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const schedule = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.SCHEDULE, schedule);
        }
    });

    // Settings
    onValue(dbRefs.settings(), (snapshot) => {
        if (snapshot.exists()) {
            setOne(STORAGE_KEYS.SETTINGS, snapshot.val());
            // Dispatch event for components to react
            window.dispatchEvent(new Event('settingsUpdated'));
        }
    });

    // Album
    onValue(dbRefs.album(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const album = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.ALBUM, album);
        }
    });

    // Achievements
    onValue(dbRefs.achievements(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const achievements = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.ACHIEVEMENTS, achievements);
        }
    });

    // Excuses
    onValue(dbRefs.excuses(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const excuses = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.EXCUSES, excuses);
        }
    });

    // Complaints
    onValue(dbRefs.complaints(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const complaints = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.COMPLAINTS, complaints);
        }
    });

    // Feedback
    onValue(dbRefs.feedback(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const feedbacks = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.FEEDBACK, feedbacks);
        }
    });

    // Campaigns
    onValue(dbRefs.campaigns(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const campaigns = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.CAMPAIGNS, campaigns);
        }
    });

    // Journal
    onValue(dbRefs.journal(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const journal = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.JOURNAL, journal);
        }
    });

    // Logs
    onValue(dbRefs.logs(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const logs = Object.keys(data).map(key => ({ ...data[key], id: key }));
            set(STORAGE_KEYS.LOGS, logs);
        }
    });
};

// Initialize Firebase sync
initFirebase();

// --- Generic Helpers ---
const get = <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]');
const set = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));
const getOne = <T>(key: string): T | null => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
};
const setOne = <T>(key: string, data: T) => localStorage.setItem(key, JSON.stringify(data));

// Firebase sync helper - syncs to Firebase in background
const syncToFirebase = async <T extends { id: string }>(refFn: (id: string) => ReturnType<typeof dbRefs.user>, item: T) => {
    try {
        await dbHelpers.setData(refFn(item.id), item);
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
};

const deleteFromFirebase = async (refFn: (id: string) => ReturnType<typeof dbRefs.user>, id: string) => {
    try {
        await dbHelpers.removeData(refFn(id));
    } catch (error) {
        console.error('Firebase delete error:', error);
    }
};


// --- Auth Services (Simulated) ---

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export const login = (identifier: string, pass: string): User | null => {
    const users = get<User>(STORAGE_KEYS.USERS);
    const user = users.find(u => (u.username === identifier || u.email === identifier));
    
    if (user && user.status === 'active') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        logAccess(user.id, 'LOGIN', 'User logged in');
        return user;
    }
    return null;
};

export const registerUser = (user: User) => {
    const users = get<User>(STORAGE_KEYS.USERS);
    users.push(user);
    set(STORAGE_KEYS.USERS, users);
    syncToFirebase(dbRefs.user, user);
    logAccess('SYSTEM', 'REGISTER', `New user registered: ${user.username}`);
};

// --- Feature Services ---

export const getUsers = () => get<User>(STORAGE_KEYS.USERS);

export const updateUser = (updatedUser: User) => {
    const users = get<User>(STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        set(STORAGE_KEYS.USERS, users);
        syncToFirebase(dbRefs.user, updatedUser);
        
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === updatedUser.id) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }
    }
};

export const getTodos = () => get<ToDoItem>(STORAGE_KEYS.TODOS);

export const saveTodo = (todo: ToDoItem) => {
    const items = getTodos();
    const idx = items.findIndex(t => t.id === todo.id);
    if (idx >= 0) items[idx] = todo;
    else items.push(todo);
    set(STORAGE_KEYS.TODOS, items);
    syncToFirebase(dbRefs.todo, todo);
};

export const deleteTodo = (todoId: string) => {
    let items = getTodos();
    items = items.filter(t => t.id !== todoId);
    set(STORAGE_KEYS.TODOS, items);
    deleteFromFirebase(dbRefs.todo, todoId);
}

export const getTransactions = () => get<Transaction>(STORAGE_KEYS.TRANSACTIONS);
export const addTransaction = (tx: Transaction) => {
    const list = getTransactions();
    list.push(tx);
    set(STORAGE_KEYS.TRANSACTIONS, list);
    syncToFirebase(dbRefs.transaction, tx);
};

export const deleteTransaction = (id: string) => {
    let list = getTransactions();
    list = list.filter(t => t.id !== id);
    set(STORAGE_KEYS.TRANSACTIONS, list);
    deleteFromFirebase(dbRefs.transaction, id);
};

export const updateTransaction = (tx: Transaction) => {
    const list = getTransactions();
    const idx = list.findIndex(t => t.id === tx.id);
    if (idx >= 0) {
        list[idx] = tx;
        set(STORAGE_KEYS.TRANSACTIONS, list);
        syncToFirebase(dbRefs.transaction, tx);
    }
};

// --- Campaign Services ---
export const getCampaigns = () => get<Campaign>(STORAGE_KEYS.CAMPAIGNS);
export const saveCampaign = (camp: Campaign) => {
    const list = getCampaigns();
    const idx = list.findIndex(c => c.id === camp.id);
    if (idx >= 0) list[idx] = camp;
    else list.push(camp);
    set(STORAGE_KEYS.CAMPAIGNS, list);
    syncToFirebase(dbRefs.campaign, camp);
};

// --- Attendance Services ---
export const getAttendance = () => get<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);

export const getAttendanceByStudent = (studentId: string) => {
    return getAttendance().filter(r => r.studentId === studentId);
};

export const saveAttendance = (records: AttendanceRecord[]) => {
    let list = getAttendance();
    records.forEach(newRecord => {
        // Check if updating existing record (by ID) OR overwriting daily status (date + student)
        const existingIdx = list.findIndex(r => r.id === newRecord.id || (r.date === newRecord.date && r.studentId === newRecord.studentId));
        if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...newRecord };
        } else {
            list.push(newRecord);
        }
        syncToFirebase(dbRefs.attendanceRecord, newRecord);
    });
    set(STORAGE_KEYS.ATTENDANCE, list);
};

export const updateAttendanceRecord = (record: AttendanceRecord) => {
    const list = getAttendance();
    const idx = list.findIndex(r => r.id === record.id);
    if (idx >= 0) {
        list[idx] = record;
        set(STORAGE_KEYS.ATTENDANCE, list);
    } else {
        // If not found, add it
        list.push(record);
        set(STORAGE_KEYS.ATTENDANCE, list);
    }
    syncToFirebase(dbRefs.attendanceRecord, record);
}

// --- Excuse Services ---
export const getExcuseRequests = () => get<ExcuseRequest>(STORAGE_KEYS.EXCUSES);
export const addExcuseRequest = (req: ExcuseRequest) => {
    const list = getExcuseRequests();
    list.push(req);
    set(STORAGE_KEYS.EXCUSES, list);
    syncToFirebase(dbRefs.excuse, req);
};
export const updateExcuseStatus = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const list = getExcuseRequests();
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) {
        list[idx].status = status;
        set(STORAGE_KEYS.EXCUSES, list);
        syncToFirebase(dbRefs.excuse, list[idx]);
    }
};

// --- Complaint Services ---
export const getComplaints = () => get<AttendanceComplaint>(STORAGE_KEYS.COMPLAINTS);
export const fileComplaint = (comp: AttendanceComplaint) => {
    const list = getComplaints();
    list.push(comp);
    set(STORAGE_KEYS.COMPLAINTS, list);
    syncToFirebase(dbRefs.complaint, comp);
};
export const resolveComplaint = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const list = getComplaints();
    const idx = list.findIndex(c => c.id === id);
    if (idx >= 0) {
        list[idx].status = status;
        set(STORAGE_KEYS.COMPLAINTS, list);
        syncToFirebase(dbRefs.complaint, list[idx]);
    }
};

// --- New Attendance Helper ---
export const generateAttendanceReport = (date: string): string => {
    const allRecords = getAttendance();
    const dayRecords = allRecords.filter(r => r.date === date);
    const users = getUsers().filter(u => u.role === UserRole.STUDENT);
    
    const present = dayRecords.filter(r => r.status === 'PRESENT').length;
    const late = dayRecords.filter(r => r.status === 'LATE');
    const absent = dayRecords.filter(r => r.status === 'ABSENT');
    const excused = dayRecords.filter(r => r.status === 'EXCUSED');
    
    // Find names
    const getName = (id: string) => users.find(u => u.id === id)?.fullName || id;
    
    return `
📅 *ATTENDANCE REPORT*
Date: ${date}

✅ *PRESENT*: ${present}

⚠️ *LATE* (${late.length}):
${late.map(r => `- ${getName(r.studentId)}`).join('\n') || 'None'}

❌ *ABSENT* (${absent.length}):
${absent.map(r => `- ${getName(r.studentId)}`).join('\n') || 'None'}

📝 *EXCUSED* (${excused.length}):
${excused.map(r => `- ${getName(r.studentId)}`).join('\n') || 'None'}
    `.trim();
};

export const getLogs = () => get<AccessLog>(STORAGE_KEYS.LOGS);
export const logAccess = (userId: string, action: string, details: string) => {
    const log: AccessLog = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        userId,
        action,
        details
    };
    const logs = getLogs();
    logs.unshift(log);
    set(STORAGE_KEYS.LOGS, logs);
    syncToFirebase(dbRefs.log, log);
};

export const getAnnouncements = () => get<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS);
export const addAnnouncement = (ann: Announcement) => {
    const list = getAnnouncements();
    list.unshift(ann);
    set(STORAGE_KEYS.ANNOUNCEMENTS, list);
    syncToFirebase(dbRefs.announcement, ann);
};

// --- Schedule (Dynamic) ---
export const getSchedule = () => get<ClassSchedule>(STORAGE_KEYS.SCHEDULE);
export const saveScheduleItem = (item: ClassSchedule) => {
    const schedule = getSchedule();
    const idx = schedule.findIndex(s => s.id === item.id);
    if (idx >= 0) schedule[idx] = item;
    else schedule.push(item);
    set(STORAGE_KEYS.SCHEDULE, schedule);
    syncToFirebase(dbRefs.scheduleItem, item);
};
export const deleteScheduleItem = (id: string) => {
    let schedule = getSchedule();
    schedule = schedule.filter(s => s.id !== id);
    set(STORAGE_KEYS.SCHEDULE, schedule);
    deleteFromFirebase(dbRefs.scheduleItem, id);
};

// --- Settings ---
export const getSettings = (): ClassSettings => {
    return getOne<ClassSettings>(STORAGE_KEYS.SETTINGS) || {
        logoUrl: LOGO_URL,
        className: APP_NAME,
        academicYear: '2023-2024'
    };
};
export const updateSettings = (settings: ClassSettings) => {
    setOne(STORAGE_KEYS.SETTINGS, settings);
    dbHelpers.setData(dbRefs.settings(), settings).catch(console.error);
};

// --- Landing Page Data ---
export const getAlbum = (): AlbumImage[] => get<AlbumImage>(STORAGE_KEYS.ALBUM);
export const saveAlbum = (album: AlbumImage[]) => {
    set(STORAGE_KEYS.ALBUM, album);
    album.forEach(img => syncToFirebase(dbRefs.albumImage, img));
};

export const getAchievements = (): Achievement[] => get<Achievement>(STORAGE_KEYS.ACHIEVEMENTS);
export const saveAchievements = (ach: Achievement[]) => {
    set(STORAGE_KEYS.ACHIEVEMENTS, ach);
    ach.forEach(a => syncToFirebase(dbRefs.achievement, a));
};

export const getFeedbacks = () => get<Feedback>(STORAGE_KEYS.FEEDBACK);
export const saveFeedback = (feedback: Feedback) => {
    const list = getFeedbacks();
    list.unshift(feedback);
    set(STORAGE_KEYS.FEEDBACK, list);
    syncToFirebase(dbRefs.feedbackItem, feedback);
};

export const getResources = (): Resource[] => [
    { id: '1', title: 'Filipino 1 Syllabus', type: 'PDF', url: '#', description: 'Course outline and grading system', dateAdded: Date.now() - 10000000 },
    { id: '2', title: 'Noli Me Tangere - Chapter 1-5', type: 'PDF', url: '#', description: 'Reading materials for next week', dateAdded: Date.now() - 500000 },
    { id: '3', title: 'Group Project Guidelines', type: 'DOC', url: '#', description: 'Instructions for the final project', dateAdded: Date.now() }
];

export const getGrades = (userId: string): Grade[] => [
    { id: 'g1', subject: 'Filipino 1', quarter: '1st', score: 92, weight: 25, type: 'WRITTEN', date: '2023-09-15' },
    { id: 'g2', subject: 'Filipino 1', quarter: '1st', score: 88, weight: 40, type: 'PERFORMANCE', date: '2023-09-20' },
    { id: 'g3', subject: 'Komunikasyon', quarter: '1st', score: 95, weight: 30, type: 'EXAM', date: '2023-10-05' },
    { id: 'g4', subject: 'Kasaysayan', quarter: '1st', score: 85, weight: 20, type: 'WRITTEN', date: '2023-09-10' },
];

// --- Media Upload Service ---

import { uploadToDrive, uploadProfilePicture as driveUploadProfile } from './driveService';

export const uploadMedia = async (file: File): Promise<string> => {
    const result = await uploadToDrive(file, 'general');
    
    if (result.success && result.url) {
        return result.url;
    }
    
    // Fallback to data URL if upload fails
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const uploadProfilePicture = async (file: File, userId: string): Promise<string> => {
    return driveUploadProfile(file, userId);
};

// --- Journal Services ---
export const getJournalEntries = (userId: string): JournalEntry[] => {
    const all = get<JournalEntry>(STORAGE_KEYS.JOURNAL);
    return all.filter(entry => entry.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
};

export const getJournalEntryByDate = (userId: string, date: string): JournalEntry | null => {
    const entries = getJournalEntries(userId);
    return entries.find(entry => entry.date === date) || null;
};

export const saveJournalEntry = (entry: JournalEntry) => {
    const all = get<JournalEntry>(STORAGE_KEYS.JOURNAL);
    const updatedEntry = { ...entry, updatedAt: Date.now() };
    const idx = all.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
        all[idx] = updatedEntry;
    } else {
        all.push(updatedEntry);
    }
    set(STORAGE_KEYS.JOURNAL, all);
    syncToFirebase(dbRefs.journalEntry, updatedEntry);
};

export const deleteJournalEntry = (entryId: string) => {
    let all = get<JournalEntry>(STORAGE_KEYS.JOURNAL);
    all = all.filter(e => e.id !== entryId);
    set(STORAGE_KEYS.JOURNAL, all);
    deleteFromFirebase(dbRefs.journalEntry, entryId);
};

export const searchJournalEntries = (userId: string, query: string): JournalEntry[] => {
    const entries = getJournalEntries(userId);
    const lowerQuery = query.toLowerCase();
    return entries.filter(entry => 
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery) ||
        entry.lessons.toLowerCase().includes(lowerQuery) ||
        entry.date.includes(query) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
};

// --- Registration Applications Services ---
import { RegistrationApplication, ApplicationStatus } from '../types';

const APPLICATIONS_KEY = 'cs_applications';

// Initialize applications storage
if (!localStorage.getItem(APPLICATIONS_KEY)) {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([]));
}

export const getApplications = (): RegistrationApplication[] => {
    return get<RegistrationApplication>(APPLICATIONS_KEY).sort((a, b) => b.submittedAt - a.submittedAt);
};

export const getApplicationsByStatus = (status: ApplicationStatus): RegistrationApplication[] => {
    return getApplications().filter(app => app.status === status);
};

export const getApplicationById = (id: string): RegistrationApplication | null => {
    const apps = getApplications();
    return apps.find(app => app.id === id) || null;
};

export const submitApplication = (application: Omit<RegistrationApplication, 'id' | 'status' | 'submittedAt'>): RegistrationApplication => {
    const apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    
    const newApp: RegistrationApplication = {
        ...application,
        id: `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        submittedAt: Date.now()
    };
    
    apps.push(newApp);
    set(APPLICATIONS_KEY, apps);
    
    // Sync to Firebase (fire and forget with proper error handling)
    dbHelpers.setData(dbRefs.application(newApp.id), newApp)
        .then(() => console.log('Application synced to Firebase:', newApp.id))
        .catch((error) => console.error('Firebase sync error for application:', error));
    
    return newApp;
};

export const updateApplicationStatus = (
    applicationId: string, 
    status: ApplicationStatus, 
    reviewedBy: string, 
    notes?: string,
    rejectionReason?: string
): RegistrationApplication | null => {
    const apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    const idx = apps.findIndex(app => app.id === applicationId);
    
    if (idx < 0) return null;
    
    apps[idx] = {
        ...apps[idx],
        status,
        reviewedAt: Date.now(),
        reviewedBy,
        reviewNotes: notes,
        rejectionReason
    };
    
    set(APPLICATIONS_KEY, apps);
    
    // If approved, create the user account
    if (status === 'approved') {
        const app = apps[idx];
        const sectionCode = app.section || '1SF';
        const idCode = `${sectionCode}-${app.studentId}`;
        
        const newUser: User = {
            id: idCode,
            studentId: app.studentId,
            username: app.username,
            email: app.universityEmail,
            personalEmail: app.personalEmail,
            role: UserRole.STUDENT,
            fullName: app.fullName,
            status: 'active',
            avatar: app.avatar,
            avatarFileId: app.avatarFileId,
            contactNumber: app.contactNumber,
            socialLinks: app.socialLinks,
            province: app.province,
            city: app.city,
            barangay: app.barangay,
            purokHouseNumber: app.purokHouseNumber,
            school: app.school,
            college: app.college,
            program: app.program,
            major: app.major,
            yearLevel: app.yearLevel,
            section: app.section,
            emergencyPerson: app.emergencyPerson,
            emergencyContact: app.emergencyContact,
            registeredAt: Date.now(),
            verifiedEmail: true
        };
        
        registerUser(newUser);
    }
    
    // Sync to Firebase
    try {
        dbHelpers.setData(dbRefs.application(apps[idx].id), apps[idx]);
    } catch (error) {
        console.error('Firebase sync error for application:', error);
    }
    
    return apps[idx];
};

export const deleteApplication = (applicationId: string): boolean => {
    let apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    const initialLength = apps.length;
    apps = apps.filter(app => app.id !== applicationId);
    
    if (apps.length === initialLength) return false;
    
    set(APPLICATIONS_KEY, apps);
    
    // Remove from Firebase
    try {
        dbHelpers.removeData(dbRefs.application(applicationId));
    } catch (error) {
        console.error('Firebase delete error for application:', error);
    }
    
    return true;
};

// Check if email or student ID already has a pending application
export const checkExistingApplication = (studentId: string, email: string): RegistrationApplication | null => {
    const apps = getApplications();
    return apps.find(app => 
        (app.studentId === studentId || app.universityEmail === email) && 
        (app.status === 'pending' || app.status === 'verifying')
    ) || null;
};
