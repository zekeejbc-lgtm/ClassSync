
import { User, ToDoItem, Transaction, AttendanceRecord, AccessLog, Announcement, UserRole, UserPosition, Resource, Grade, ClassSchedule, ClassSettings, AlbumImage, Achievement, ExcuseRequest, AttendanceComplaint, Feedback, Campaign, JournalEntry, School, Department, College, Program, Major, Track, Strand, YearLevel, Section } from '../types';
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
  JOURNAL: 'cs_journal',
  // School Structure Keys
  SCHOOLS: 'cs_schools',
  DEPARTMENTS: 'cs_departments',
  COLLEGES: 'cs_colleges',
  PROGRAMS: 'cs_programs',
  MAJORS: 'cs_majors',
  TRACKS: 'cs_tracks',
  STRANDS: 'cs_strands',
  YEAR_LEVELS: 'cs_year_levels',
  SECTIONS: 'cs_sections'
};

// --- Hardcoded Admin User (Single Source of Truth) ---
const ADMIN_USER: User = {
    id: '1SF-2025-00046',
    studentId: '2025-00046',
    username: 'EznH2025',
    email: 'ejbcrisostomo03202500046@usep.edu.ph',
    role: UserRole.ADMIN,
    position: undefined, // Admin doesn't need a position
    fullName: 'Ezequiel John B. Crisostomo',
    status: 'active',
    section: '1SF',
    registeredAt: Date.now(),
    verifiedEmail: true
};

// --- Helper for Mock Data Initialization ---
const initData = () => {
  // Always ensure admin account exists
  const adminUser = ADMIN_USER;
  
  const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!existingUsers) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([adminUser]));
  } else {
    // Ensure admin exists in the list and is up to date
    const users: User[] = JSON.parse(existingUsers);
    const adminIndex = users.findIndex(u => u.username === 'EznH2025' || u.id === '1SF-2025-00046');
    
    if (adminIndex === -1) {
      users.push(adminUser);
    } else {
      // Force update admin user to ensure credentials match
      users[adminIndex] = adminUser;
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
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

  // Initialize School Structure
  if (!localStorage.getItem(STORAGE_KEYS.SCHOOLS)) localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.COLLEGES)) localStorage.setItem(STORAGE_KEYS.COLLEGES, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.PROGRAMS)) localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.MAJORS)) localStorage.setItem(STORAGE_KEYS.MAJORS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.TRACKS)) localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.STRANDS)) localStorage.setItem(STORAGE_KEYS.STRANDS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.YEAR_LEVELS)) localStorage.setItem(STORAGE_KEYS.YEAR_LEVELS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.SECTIONS)) localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify([]));
};

// Export function to clear all data and reinitialize (useful for testing or reset)
export const clearAllData = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    initData();
    console.log('All data cleared and reinitialized');
};

// Clear demo data - removes all users except admin, clears applications
export const clearDemoData = async () => {
    // Keep only admin user
    const users = get<User>(STORAGE_KEYS.USERS);
    const adminOnly = users.filter(u => u.username === 'EznH2025' || u.role === UserRole.ADMIN);
    set(STORAGE_KEYS.USERS, adminOnly);
    
    // Clear all applications
    set('cs_applications', []);
    
    // Clear from Firebase too
    try {
        // Get all users and remove non-admin ones from Firebase
        const firebaseUsers = await dbHelpers.getAll<User>(dbRefs.users());
        for (const u of firebaseUsers) {
            if (u.username !== 'EznH2025' && u.role !== UserRole.ADMIN) {
                await dbHelpers.removeData(dbRefs.user(u.id));
            }
        }
        
        // Clear applications from Firebase
        const firebaseApps = await dbHelpers.getAll<any>(dbRefs.applications());
        for (const app of firebaseApps) {
            await dbHelpers.removeData(dbRefs.application(app.id));
        }
        
        console.log('Demo data cleared from local and Firebase');
        window.dispatchEvent(new Event('applicationsUpdated'));
        return true;
    } catch (error) {
        console.error('Error clearing demo data from Firebase:', error);
        return false;
    }
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

        // Ensure locally stored applications are synced to Firebase as well
        await syncApplicationsToFirebase();

        // One-time migration: per request, remove all current applications (local + Firebase)
        if (!localStorage.getItem(CLEAR_APPS_MIGRATION_KEY)) {
            await clearApplications(true);
            localStorage.setItem(CLEAR_APPS_MIGRATION_KEY, 'done');
            console.log('[Migration] Cleared all applications (one-time).');
        }
        
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

    // Applications
    onValue(dbRefs.applications(), (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const apps = Object.keys(data).map(key => ({ ...data[key], id: key }));
            apps.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
            set('cs_applications', apps as any);
            try { window.dispatchEvent(new Event('applicationsUpdated')); } catch {}
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
    console.log(`[Auth] Attempting login for: ${identifier}`);

    // 1. Hardcoded Admin Override (Ensures access even if DB is out of sync)
    if ((identifier === 'EznH2025' || identifier === 'ejbcrisostomo03202500046@usep.edu.ph') && pass === '2025-00046') {
         const adminUser: User = {
            id: '1SF-2025-00046',
            studentId: '2025-00046',
            username: 'EznH2025',
            email: 'ejbcrisostomo03202500046@usep.edu.ph',
            role: UserRole.ADMIN,
            fullName: 'Ezequiel John B. Crisostomo',
            status: 'active',
            section: '1SF',
            registeredAt: Date.now(),
            verifiedEmail: true
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(adminUser));
        logAccess(adminUser.id, 'LOGIN', 'Admin logged in via override');
        return adminUser;
    }

    const users = get<User>(STORAGE_KEYS.USERS);
    const user = users.find(u => (u.username === identifier || u.email === identifier));
    
    // Check user exists, is active, and password matches studentId
    if (user && user.status === 'active' && user.studentId === pass) {
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

export const getUsers = () => {
    const users = get<User>(STORAGE_KEYS.USERS);
    // Ensure admin is always present in the returned list, even if Firebase sync wiped it
    if (!users.some(u => u.studentId === ADMIN_USER.studentId)) {
        users.push(ADMIN_USER);
    }
    return users;
};

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

// Upload with custom action (for school logos, class logos, etc.)
export const uploadWithAction = async (file: File, action: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onloadend = async () => {
            try {
                const base64Data = (reader.result as string).split(',')[1];
                const filename = `${action}_${Date.now()}_${file.name}`;
                
                const payload = {
                    action: action,
                    payload: {
                        data: base64Data,
                        mimeType: file.type,
                        filename: filename
                    }
                };

                // Get GAS URL from driveService
                const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
                
                // For development/testing - return local data URL
                if (GAS_WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID')) {
                    console.log('DEV MODE: Returning local data URL. Deploy GAS and update URL for production.');
                    resolve(reader.result as string);
                    return;
                }

                // Production: Send to GAS endpoint
                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (result.success && result.url) {
                    resolve(result.url);
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                console.error(`${action} upload error:`, error);
                // Fallback to data URL
                resolve(reader.result as string);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

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
import { RegistrationApplication, ApplicationStatus, FieldVerification, ApplicationFieldVerifications } from '../types';

const APPLICATIONS_KEY = 'cs_applications';
const CLEAR_APPS_MIGRATION_KEY = 'cs_migration_clear_apps_20251203';

// Initialize applications storage
if (!localStorage.getItem(APPLICATIONS_KEY)) {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([]));
}

// Helper for matching fields (case-insensitive)
const matchField = (value?: string, query?: string) => {
    if (!query) return true;
    const v = (value || '').toString().trim().toLowerCase();
    const q = query.toString().trim().toLowerCase();
    return v === q;
};

// Background reconciliation: ensure local applications exist in Firebase
const syncApplicationsToFirebase = async () => {
    try {
        const fbApps = await dbHelpers.getAll<any>(dbRefs.applications());
        const fbIds = new Set(fbApps.map(a => a.id));
        const localApps = get<RegistrationApplication>(APPLICATIONS_KEY);
        const missing = localApps.filter(a => !fbIds.has(a.id));
        if (missing.length > 0) {
            console.log(`[Sync] Pushing ${missing.length} local application(s) to Firebase...`);
            for (const app of missing) {
                try {
                    await dbHelpers.setData(dbRefs.application(app.id), app);
                } catch (e) {
                    console.error('Failed to sync application to Firebase:', app.id, e);
                }
            }
        }
    } catch (e) {
        console.error('Applications sync check failed:', e);
    }
};

export const getApplications = (): RegistrationApplication[] => {
    return get<RegistrationApplication>(APPLICATIONS_KEY).sort((a, b) => b.submittedAt - a.submittedAt);
};

// Fetch applications directly from Firebase (for real-time tracking)
export const getApplicationsFromFirebase = async (): Promise<RegistrationApplication[]> => {
    try {
        const apps = await dbHelpers.getAll<RegistrationApplication>(dbRefs.applications());
        // Also update local cache
        apps.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        set(APPLICATIONS_KEY, apps);
        return apps;
    } catch (error) {
        console.error('Failed to fetch from Firebase, using local cache:', error);
        return getApplications();
    }
};

// Find applications with optional Firebase refresh
export const findApplicationsRealtime = async (criteria: ApplicationLookupCriteria): Promise<RegistrationApplication[]> => {
    // First fetch fresh data from Firebase
    const apps = await getApplicationsFromFirebase();
    
    return apps.filter(app =>
        matchField(app.studentId, criteria.studentId) &&
        matchField(app.section, criteria.section) &&
        matchField(app.school, criteria.school) &&
        matchField(app.college, criteria.college) &&
        matchField(app.program, criteria.program) &&
        matchField(app.major, criteria.major)
    );
};

// Remove all applications locally and in Firebase (optional)
export const clearApplications = async (alsoFirebase: boolean = true): Promise<void> => {
    try {
        const existing = get<RegistrationApplication>(APPLICATIONS_KEY);
        set(APPLICATIONS_KEY, []);
        if (alsoFirebase) {
            // Prefer fetching current Firebase list to ensure we remove everything
            const fbApps = await dbHelpers.getAll<any>(dbRefs.applications());
            const ids = fbApps.length > 0 ? fbApps.map(a => a.id) : existing.map(a => a.id);
            for (const id of ids) {
                try { await dbHelpers.removeData(dbRefs.application(id)); } catch {}
            }
        }
        console.log('All applications cleared', { alsoFirebase });
    } catch (e) {
        console.error('Failed to clear applications:', e);
    }
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
        .catch((error) => {
            console.error('Firebase sync error for application:', error);
            // Emit a window event so UI can inform the user / retry later
            try { window.dispatchEvent(new CustomEvent('applicationSyncFailed', { detail: { id: newApp.id, error } })); } catch {}
        });
    
    return newApp;
};

// Verify a specific field in an application
export const verifyApplicationField = (
    applicationId: string,
    fieldName: keyof ApplicationFieldVerifications,
    verified: boolean,
    verifiedBy: string,
    issue?: string
): RegistrationApplication | null => {
    const apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    const idx = apps.findIndex(app => app.id === applicationId);
    
    if (idx < 0) return null;
    
    const fieldVerifications = apps[idx].fieldVerifications || {};
    fieldVerifications[fieldName] = {
        verified,
        verifiedAt: Date.now(),
        verifiedBy,
        issue: verified ? undefined : issue
    };
    
    // Update fields needing correction
    const fieldsNeedingCorrection = Object.entries(fieldVerifications)
        .filter(([_, v]) => v && !v.verified && v.issue)
        .map(([k, _]) => k);
    
    apps[idx] = {
        ...apps[idx],
        fieldVerifications,
        fieldsNeedingCorrection: fieldsNeedingCorrection.length > 0 ? fieldsNeedingCorrection : undefined
    };
    
    set(APPLICATIONS_KEY, apps);
    
    // Sync to Firebase
    try {
        dbHelpers.setData(dbRefs.application(apps[idx].id), apps[idx]);
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new Event('applicationsUpdated'));
    
    return apps[idx];
};

// Get unverified fields with issues
export const getFieldIssues = (app: RegistrationApplication): { field: string; issue: string }[] => {
    if (!app.fieldVerifications) return [];
    
    return Object.entries(app.fieldVerifications)
        .filter(([_, v]) => v && !v.verified && v.issue)
        .map(([field, v]) => ({ field, issue: v!.issue! }));
};

// Check if all fields are verified
export const areAllFieldsVerified = (app: RegistrationApplication): boolean => {
    if (!app.fieldVerifications) return false;
    
    const requiredFields: (keyof ApplicationFieldVerifications)[] = [
        'studentId', 'universityEmail', 'fullName', 'contactNumber',
        'province', 'city', 'barangay', 'school', 'college', 'program',
        'section', 'emergencyPerson', 'emergencyContact'
    ];
    
    return requiredFields.every(field => 
        app.fieldVerifications?.[field]?.verified === true
    );
};

// Update specific fields in an application (for resubmission)
export const updateApplicationFields = (
    applicationId: string,
    updates: Partial<RegistrationApplication>
): RegistrationApplication | null => {
    const apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    const idx = apps.findIndex(app => app.id === applicationId);
    
    if (idx < 0) return null;
    
    // Clear verification status for updated fields
    const fieldVerifications = { ...apps[idx].fieldVerifications };
    Object.keys(updates).forEach(key => {
        if (key in fieldVerifications) {
            delete (fieldVerifications as any)[key];
        }
    });
    
    // Update fields needing correction - remove corrected ones
    const fieldsNeedingCorrection = (apps[idx].fieldsNeedingCorrection || [])
        .filter(field => !Object.keys(updates).includes(field));
    
    apps[idx] = {
        ...apps[idx],
        ...updates,
        fieldVerifications: Object.keys(fieldVerifications).length > 0 ? fieldVerifications : undefined,
        fieldsNeedingCorrection: fieldsNeedingCorrection.length > 0 ? fieldsNeedingCorrection : undefined,
        status: 'pending', // Reset to pending after resubmission
        resubmittedAt: Date.now(),
        // Clear rejection data
        rejectionReason: undefined
    };
    
    set(APPLICATIONS_KEY, apps);
    
    // Sync to Firebase
    try {
        dbHelpers.setData(dbRefs.application(apps[idx].id), apps[idx]);
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new Event('applicationsUpdated'));
    
    return apps[idx];
};

// Resubmit a rejected application (full re-registration with same ID)
export const resubmitApplication = (
    originalApplicationId: string,
    newData: Omit<RegistrationApplication, 'id' | 'status' | 'submittedAt'>,
    attemptNumber: number
): RegistrationApplication | null => {
    const apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    const idx = apps.findIndex(app => app.id === originalApplicationId);
    
    if (idx < 0) return null;
    
    // Only allow resubmission of rejected applications
    if (apps[idx].status !== 'rejected') {
        console.error('Can only resubmit rejected applications');
        return null;
    }
    
    // Update the existing application with new data
    apps[idx] = {
        ...apps[idx],
        ...newData,
        status: 'pending', // Reset to pending
        attemptNumber,
        resubmittedAt: Date.now(),
        // Clear previous review data
        fieldVerifications: undefined,
        fieldsNeedingCorrection: undefined,
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNotes: undefined,
        rejectionReason: undefined
    };
    
    set(APPLICATIONS_KEY, apps);
    
    // Sync to Firebase
    try {
        dbHelpers.setData(dbRefs.application(apps[idx].id), apps[idx]);
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new Event('applicationsUpdated'));
    
    return apps[idx];
};

// Mark application as needing corrections (with specific fields)
export const requestApplicationCorrections = (
    applicationId: string,
    fieldsWithIssues: { field: keyof ApplicationFieldVerifications; issue: string }[],
    reviewedBy: string
): RegistrationApplication | null => {
    const apps = get<RegistrationApplication>(APPLICATIONS_KEY);
    const idx = apps.findIndex(app => app.id === applicationId);
    
    if (idx < 0) return null;
    
    const fieldVerifications = apps[idx].fieldVerifications || {};
    
    // Mark specified fields as having issues
    fieldsWithIssues.forEach(({ field, issue }) => {
        fieldVerifications[field] = {
            verified: false,
            verifiedAt: Date.now(),
            verifiedBy: reviewedBy,
            issue
        };
    });
    
    const fieldsNeedingCorrection = fieldsWithIssues.map(f => f.field);
    
    apps[idx] = {
        ...apps[idx],
        status: 'verifying', // Keep in verifying state, waiting for corrections
        fieldVerifications,
        fieldsNeedingCorrection,
        reviewedBy
    };
    
    set(APPLICATIONS_KEY, apps);
    
    // Sync to Firebase
    try {
        dbHelpers.setData(dbRefs.application(apps[idx].id), apps[idx]);
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new Event('applicationsUpdated'));
    
    return apps[idx];
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
    
    // Dispatch event for real-time tracking updates
    window.dispatchEvent(new Event('applicationsUpdated'));
    
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

// --- Application Lookup & Progress Helpers ---
export interface ApplicationLookupCriteria {
    studentId?: string;
    section?: string;
    school?: string;
    college?: string;
    program?: string;
    major?: string;
}

export const findApplications = (criteria: ApplicationLookupCriteria): RegistrationApplication[] => {
    const apps = getApplications();
    return apps.filter(app =>
        matchField(app.studentId, criteria.studentId) &&
        matchField(app.section, criteria.section) &&
        matchField(app.school, criteria.school) &&
        matchField(app.college, criteria.college) &&
        matchField(app.program, criteria.program) &&
        matchField(app.major, criteria.major)
    );
};

export const applicationProgress = (app: RegistrationApplication) => {
    const steps = [
        { key: 'submitted', label: 'Submitted', complete: true },
        { key: 'verifying', label: 'Under Verification', complete: app.status === 'verifying' || app.status === 'approved' || app.status === 'rejected' },
        { key: 'final', label: app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Decision', complete: app.status === 'approved' || app.status === 'rejected' }
    ];
    const stepIndex = app.status === 'pending' ? 0 : app.status === 'verifying' ? 1 : 2;
    return { stepIndex, steps };
};

// ==========================================
// SCHOOL STRUCTURE CRUD FUNCTIONS
// ==========================================

// --- Schools ---
export const getSchools = (): School[] => get<School>(STORAGE_KEYS.SCHOOLS);

export const getSchoolById = (id: string): School | undefined => {
    return getSchools().find(s => s.id === id);
};

export const addSchool = (school: Omit<School, 'id' | 'createdAt'>): School => {
    const schools = getSchools();
    const newSchool: School = {
        ...school,
        id: `school_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    schools.push(newSchool);
    set(STORAGE_KEYS.SCHOOLS, schools);
    return newSchool;
};

export const updateSchool = (school: School): void => {
    const schools = getSchools();
    const idx = schools.findIndex(s => s.id === school.id);
    if (idx !== -1) {
        schools[idx] = school;
        set(STORAGE_KEYS.SCHOOLS, schools);
    }
};

export const deleteSchool = (id: string): void => {
    set(STORAGE_KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
    // Also delete all children
    set(STORAGE_KEYS.DEPARTMENTS, getDepartments().filter(d => d.schoolId !== id));
    set(STORAGE_KEYS.COLLEGES, getColleges().filter(c => c.schoolId !== id));
    set(STORAGE_KEYS.PROGRAMS, getPrograms().filter(p => p.schoolId !== id));
    set(STORAGE_KEYS.MAJORS, getMajors().filter(m => m.schoolId !== id));
    set(STORAGE_KEYS.TRACKS, getTracks().filter(t => t.schoolId !== id));
    set(STORAGE_KEYS.STRANDS, getStrands().filter(s => s.schoolId !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.schoolId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.schoolId !== id));
};

// --- Departments ---
export const getDepartments = (): Department[] => get<Department>(STORAGE_KEYS.DEPARTMENTS);

export const getDepartmentById = (id: string): Department | undefined => {
    return getDepartments().find(d => d.id === id);
};

export const getDepartmentsBySchool = (schoolId: string): Department[] => {
    return getDepartments().filter(d => d.schoolId === schoolId && d.isActive);
};

export const addDepartment = (department: Omit<Department, 'id' | 'createdAt'>): Department => {
    const departments = getDepartments();
    const newDepartment: Department = {
        ...department,
        id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    departments.push(newDepartment);
    set(STORAGE_KEYS.DEPARTMENTS, departments);
    return newDepartment;
};

export const updateDepartment = (department: Department): void => {
    const departments = getDepartments();
    const idx = departments.findIndex(d => d.id === department.id);
    if (idx !== -1) {
        departments[idx] = department;
        set(STORAGE_KEYS.DEPARTMENTS, departments);
    }
};

export const deleteDepartment = (id: string): void => {
    set(STORAGE_KEYS.DEPARTMENTS, getDepartments().filter(d => d.id !== id));
    // Also delete children
    set(STORAGE_KEYS.COLLEGES, getColleges().filter(c => c.departmentId !== id));
    set(STORAGE_KEYS.PROGRAMS, getPrograms().filter(p => p.departmentId !== id));
    set(STORAGE_KEYS.MAJORS, getMajors().filter(m => m.departmentId !== id));
    set(STORAGE_KEYS.TRACKS, getTracks().filter(t => t.departmentId !== id));
    set(STORAGE_KEYS.STRANDS, getStrands().filter(s => s.departmentId !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.departmentId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.departmentId !== id));
};

// --- Colleges (Tertiary) ---
export const getColleges = (): College[] => get<College>(STORAGE_KEYS.COLLEGES);

export const getCollegeById = (id: string): College | undefined => {
    return getColleges().find(c => c.id === id);
};

export const getCollegesByDepartment = (departmentId: string): College[] => {
    return getColleges().filter(c => c.departmentId === departmentId && c.isActive);
};

export const addCollege = (college: Omit<College, 'id' | 'createdAt'>): College => {
    const colleges = getColleges();
    const newCollege: College = {
        ...college,
        id: `college_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    colleges.push(newCollege);
    set(STORAGE_KEYS.COLLEGES, colleges);
    return newCollege;
};

export const updateCollege = (college: College): void => {
    const colleges = getColleges();
    const idx = colleges.findIndex(c => c.id === college.id);
    if (idx !== -1) {
        colleges[idx] = college;
        set(STORAGE_KEYS.COLLEGES, colleges);
    }
};

export const deleteCollege = (id: string): void => {
    set(STORAGE_KEYS.COLLEGES, getColleges().filter(c => c.id !== id));
    set(STORAGE_KEYS.PROGRAMS, getPrograms().filter(p => p.collegeId !== id));
    set(STORAGE_KEYS.MAJORS, getMajors().filter(m => m.collegeId !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.programId && getPrograms().find(p => p.id === y.programId)?.collegeId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.collegeId !== id));
};

// --- Programs (Tertiary) ---
export const getPrograms = (): Program[] => get<Program>(STORAGE_KEYS.PROGRAMS);

export const getProgramById = (id: string): Program | undefined => {
    return getPrograms().find(p => p.id === id);
};

export const getProgramsByCollege = (collegeId: string): Program[] => {
    return getPrograms().filter(p => p.collegeId === collegeId && p.isActive);
};

export const addProgram = (program: Omit<Program, 'id' | 'createdAt'>): Program => {
    const programs = getPrograms();
    const newProgram: Program = {
        ...program,
        id: `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    programs.push(newProgram);
    set(STORAGE_KEYS.PROGRAMS, programs);
    return newProgram;
};

export const updateProgram = (program: Program): void => {
    const programs = getPrograms();
    const idx = programs.findIndex(p => p.id === program.id);
    if (idx !== -1) {
        programs[idx] = program;
        set(STORAGE_KEYS.PROGRAMS, programs);
    }
};

export const deleteProgram = (id: string): void => {
    set(STORAGE_KEYS.PROGRAMS, getPrograms().filter(p => p.id !== id));
    set(STORAGE_KEYS.MAJORS, getMajors().filter(m => m.programId !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.programId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.programId !== id));
};

// --- Majors (Tertiary) ---
export const getMajors = (): Major[] => get<Major>(STORAGE_KEYS.MAJORS);

export const getMajorById = (id: string): Major | undefined => {
    return getMajors().find(m => m.id === id);
};

export const getMajorsByProgram = (programId: string): Major[] => {
    return getMajors().filter(m => m.programId === programId && m.isActive);
};

export const addMajor = (major: Omit<Major, 'id' | 'createdAt'>): Major => {
    const majors = getMajors();
    const newMajor: Major = {
        ...major,
        id: `major_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    majors.push(newMajor);
    set(STORAGE_KEYS.MAJORS, majors);
    return newMajor;
};

export const updateMajor = (major: Major): void => {
    const majors = getMajors();
    const idx = majors.findIndex(m => m.id === major.id);
    if (idx !== -1) {
        majors[idx] = major;
        set(STORAGE_KEYS.MAJORS, majors);
    }
};

export const deleteMajor = (id: string): void => {
    set(STORAGE_KEYS.MAJORS, getMajors().filter(m => m.id !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.majorId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.majorId !== id));
};

// --- Tracks (Senior High) ---
export const getTracks = (): Track[] => get<Track>(STORAGE_KEYS.TRACKS);

export const getTrackById = (id: string): Track | undefined => {
    return getTracks().find(t => t.id === id);
};

export const getTracksByDepartment = (departmentId: string): Track[] => {
    return getTracks().filter(t => t.departmentId === departmentId && t.isActive);
};

export const addTrack = (track: Omit<Track, 'id' | 'createdAt'>): Track => {
    const tracks = getTracks();
    const newTrack: Track = {
        ...track,
        id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    tracks.push(newTrack);
    set(STORAGE_KEYS.TRACKS, tracks);
    return newTrack;
};

export const updateTrack = (track: Track): void => {
    const tracks = getTracks();
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx !== -1) {
        tracks[idx] = track;
        set(STORAGE_KEYS.TRACKS, tracks);
    }
};

export const deleteTrack = (id: string): void => {
    set(STORAGE_KEYS.TRACKS, getTracks().filter(t => t.id !== id));
    set(STORAGE_KEYS.STRANDS, getStrands().filter(s => s.trackId !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.strandId && getStrands().find(s => s.id === y.strandId)?.trackId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.trackId !== id));
};

// --- Strands (Senior High) ---
export const getStrands = (): Strand[] => get<Strand>(STORAGE_KEYS.STRANDS);

export const getStrandById = (id: string): Strand | undefined => {
    return getStrands().find(s => s.id === id);
};

export const getStrandsByTrack = (trackId: string): Strand[] => {
    return getStrands().filter(s => s.trackId === trackId && s.isActive);
};

export const addStrand = (strand: Omit<Strand, 'id' | 'createdAt'>): Strand => {
    const strands = getStrands();
    const newStrand: Strand = {
        ...strand,
        id: `strand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    strands.push(newStrand);
    set(STORAGE_KEYS.STRANDS, strands);
    return newStrand;
};

export const updateStrand = (strand: Strand): void => {
    const strands = getStrands();
    const idx = strands.findIndex(s => s.id === strand.id);
    if (idx !== -1) {
        strands[idx] = strand;
        set(STORAGE_KEYS.STRANDS, strands);
    }
};

export const deleteStrand = (id: string): void => {
    set(STORAGE_KEYS.STRANDS, getStrands().filter(s => s.id !== id));
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.strandId !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.strandId !== id));
};

// --- Year Levels ---
export const getYearLevels = (): YearLevel[] => get<YearLevel>(STORAGE_KEYS.YEAR_LEVELS);

export const getYearLevelById = (id: string): YearLevel | undefined => {
    return getYearLevels().find(y => y.id === id);
};

export const getYearLevelsByParent = (parentId: string, parentType: 'major' | 'program' | 'strand' | 'department'): YearLevel[] => {
    const yearLevels = getYearLevels().filter(y => y.isActive);
    switch (parentType) {
        case 'major': return yearLevels.filter(y => y.majorId === parentId);
        case 'program': return yearLevels.filter(y => y.programId === parentId && !y.majorId);
        case 'strand': return yearLevels.filter(y => y.strandId === parentId);
        case 'department': return yearLevels.filter(y => y.departmentId === parentId && !y.programId && !y.strandId && !y.majorId);
        default: return [];
    }
};

export const addYearLevel = (yearLevel: Omit<YearLevel, 'id' | 'createdAt'>): YearLevel => {
    const yearLevels = getYearLevels();
    const newYearLevel: YearLevel = {
        ...yearLevel,
        id: `year_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    yearLevels.push(newYearLevel);
    set(STORAGE_KEYS.YEAR_LEVELS, yearLevels);
    return newYearLevel;
};

export const updateYearLevel = (yearLevel: YearLevel): void => {
    const yearLevels = getYearLevels();
    const idx = yearLevels.findIndex(y => y.id === yearLevel.id);
    if (idx !== -1) {
        yearLevels[idx] = yearLevel;
        set(STORAGE_KEYS.YEAR_LEVELS, yearLevels);
    }
};

export const deleteYearLevel = (id: string): void => {
    set(STORAGE_KEYS.YEAR_LEVELS, getYearLevels().filter(y => y.id !== id));
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.yearLevelId !== id));
};

// --- Sections ---
export const getSections = (): Section[] => get<Section>(STORAGE_KEYS.SECTIONS);

export const getSectionById = (id: string): Section | undefined => {
    return getSections().find(s => s.id === id);
};

export const getSectionsByYearLevel = (yearLevelId: string): Section[] => {
    return getSections().filter(s => s.yearLevelId === yearLevelId && s.isActive);
};

export const getSectionsBySchool = (schoolId: string): Section[] => {
    return getSections().filter(s => s.schoolId === schoolId && s.isActive);
};

export const addSection = (section: Omit<Section, 'id' | 'createdAt'>): Section => {
    const sections = getSections();
    const newSection: Section = {
        ...section,
        id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };
    sections.push(newSection);
    set(STORAGE_KEYS.SECTIONS, sections);
    return newSection;
};

export const updateSection = (section: Section): void => {
    const sections = getSections();
    const idx = sections.findIndex(s => s.id === section.id);
    if (idx !== -1) {
        sections[idx] = section;
        set(STORAGE_KEYS.SECTIONS, sections);
    }
};

export const deleteSection = (id: string): void => {
    set(STORAGE_KEYS.SECTIONS, getSections().filter(s => s.id !== id));
};

// --- Helper: Get users by section ---
export const getUsersBySection = (sectionId: string): User[] => {
    return getUsers().filter(u => u.sectionId === sectionId);
};

// --- Helper: Get full path for a section (breadcrumb) ---
export const getSectionPath = (sectionId: string): {
    school?: School;
    department?: Department;
    college?: College;
    track?: Track;
    program?: Program;
    strand?: Strand;
    major?: Major;
    yearLevel?: YearLevel;
    section?: Section;
} => {
    const section = getSectionById(sectionId);
    if (!section) return {};
    
    return {
        school: section.schoolId ? getSchoolById(section.schoolId) : undefined,
        department: section.departmentId ? getDepartmentById(section.departmentId) : undefined,
        college: section.collegeId ? getCollegeById(section.collegeId) : undefined,
        track: section.trackId ? getTrackById(section.trackId) : undefined,
        program: section.programId ? getProgramById(section.programId) : undefined,
        strand: section.strandId ? getStrandById(section.strandId) : undefined,
        major: section.majorId ? getMajorById(section.majorId) : undefined,
        yearLevel: section.yearLevelId ? getYearLevelById(section.yearLevelId) : undefined,
        section
    };
};

// --- Helper: Get all schools with autosuggest ---
export const searchSchools = (query: string): School[] => {
    const lowerQuery = query.toLowerCase();
    return getSchools().filter(s => 
        s.isActive && 
        (s.name.toLowerCase().includes(lowerQuery) || s.address.toLowerCase().includes(lowerQuery))
    );
};

// --- Helper: Get dropdown options for registration ---
export interface SchoolDropdownOptions {
    schools: { id: string; name: string }[];
    departments: { id: string; name: string; schoolId: string }[];
    colleges: { id: string; name: string; departmentId: string }[];
    tracks: { id: string; name: string; departmentId: string }[];
    programs: { id: string; name: string; collegeId: string }[];
    strands: { id: string; name: string; trackId: string }[];
    majors: { id: string; name: string; programId: string }[];
    yearLevels: { id: string; name: string; parentId: string; parentType: string }[];
    sections: { id: string; name: string; yearLevelId: string }[];
}

export const getSchoolDropdownOptions = (): SchoolDropdownOptions => {
    return {
        schools: getSchools().filter(s => s.isActive).map(s => ({ id: s.id, name: s.name })),
        departments: getDepartments().filter(d => d.isActive).map(d => ({ id: d.id, name: d.name, schoolId: d.schoolId })),
        colleges: getColleges().filter(c => c.isActive).map(c => ({ id: c.id, name: c.name, departmentId: c.departmentId })),
        tracks: getTracks().filter(t => t.isActive).map(t => ({ id: t.id, name: t.name, departmentId: t.departmentId })),
        programs: getPrograms().filter(p => p.isActive).map(p => ({ id: p.id, name: p.name, collegeId: p.collegeId })),
        strands: getStrands().filter(s => s.isActive).map(s => ({ id: s.id, name: s.name, trackId: s.trackId })),
        majors: getMajors().filter(m => m.isActive).map(m => ({ id: m.id, name: m.name, programId: m.programId })),
        yearLevels: getYearLevels().filter(y => y.isActive).map(y => ({
            id: y.id,
            name: y.name,
            parentId: y.majorId || y.programId || y.strandId || y.departmentId,
            parentType: y.majorId ? 'major' : y.programId ? 'program' : y.strandId ? 'strand' : 'department'
        })),
        sections: getSections().filter(s => s.isActive).map(s => ({ id: s.id, name: s.name, yearLevelId: s.yearLevelId }))
    };
};
