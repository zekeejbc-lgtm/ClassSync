import { User, ToDoItem, Transaction, AttendanceRecord, AccessLog, Announcement, UserRole, Resource, Grade, ClassSchedule, ClassSettings, AlbumImage, Achievement, ExcuseRequest, AttendanceComplaint, Feedback, Campaign, JournalEntry } from '../types';
import { LOGO_URL, APP_NAME } from '../constants';
import { db, addToSyncQueue, getPendingSyncItems, markAsSynced, isOnline } from './db';
import { dbRefs, dbHelpers } from './firebase';
import { onValue } from 'firebase/database';

// Current user key in localStorage (for quick access)
const CURRENT_USER_KEY = 'cs_current_user';

// Simple versioning helpers for conflict avoidance
type Versioned<T extends { id: string }> = T & { updatedAt?: number };
const withVersion = <T extends { id: string; updatedAt?: number }>(entity: T): Versioned<T> => ({
    ...entity,
    updatedAt: entity.updatedAt ?? Date.now()
});
const isNewer = (incoming?: { updatedAt?: number }, existing?: { updatedAt?: number }) =>
    (incoming?.updatedAt ?? 0) >= (existing?.updatedAt ?? 0);

const putVersioned = async <T extends { id: string; updatedAt?: number }>(table: any, entity: T) => {
    await table.put(withVersion(entity));
};

const bulkPutVersioned = async <T extends { id: string; updatedAt?: number }>(table: any, entities: T[]) => {
    if (!entities.length) return;
    await table.bulkPut(entities.map(withVersion));
};

const applyIncomingList = async <T extends { id: string; updatedAt?: number }>(table: any, items: T[]) => {
    for (const item of items) {
        const existing = await table.get(item.id);
        if (!existing || isNewer(item, existing)) {
            await table.put(item);
        }
    }
};

let lastSyncAt = 0;
let pendingSyncCount = 0;

// --- Initialize Empty Data in Dexie (NO demo accounts) ---
const initializeMockData = async () => {
    const userCount = await db.users.count();
    if (userCount === 0) {
        console.log('Initializing empty data in Dexie (no demo accounts)...');
        
        // Initialize with empty settings
        const initialSettings: ClassSettings & { id: string; updatedAt?: number } = {
            id: 'main',
            logoUrl: LOGO_URL,
            className: APP_NAME,
            academicYear: '2024-2025',
            updatedAt: Date.now()
        };
        await db.settings.put(initialSettings);

        console.log('Empty data initialized in Dexie!');
    }
};

// --- Firebase Sync ---
const syncToFirebase = async <T extends { id: string; updatedAt?: number }>(
    refFn: (id: string) => ReturnType<typeof dbRefs.user>,
    item: T,
    collection: string
) => {
    const payload = withVersion(item);
    if (isOnline()) {
        try {
            await dbHelpers.setData(refFn(payload.id), payload);
        } catch (error) {
            console.error('Firebase sync error:', error);
            await addToSyncQueue('update', collection, payload.id, payload);
        }
    } else {
        await addToSyncQueue('update', collection, payload.id, payload);
    }
};

const deleteFromFirebase = async (
    refFn: (id: string) => ReturnType<typeof dbRefs.user>,
    id: string,
    collection: string
) => {
    if (isOnline()) {
        try {
            await dbHelpers.removeData(refFn(id));
        } catch (error) {
            console.error('Firebase delete error:', error);
            await addToSyncQueue('delete', collection, id);
        }
    } else {
        await addToSyncQueue('delete', collection, id);
    }
};

// --- Sync pending changes when online ---
export const syncPendingChanges = async () => {
    if (!isOnline()) return;
    
    const pending = await getPendingSyncItems();
    if (pending.length === 0) return;
    
    console.log(`Syncing ${pending.length} pending changes...`);
    pendingSyncCount = pending.length;

    const syncedIds: number[] = [];
    const refMap: Record<string, (id: string) => any> = {
        users: dbRefs.user,
        todos: dbRefs.todo,
        transactions: dbRefs.transaction,
        attendance: dbRefs.attendanceRecord,
        logs: dbRefs.log,
        announcements: dbRefs.announcement,
        schedule: dbRefs.scheduleItem,
        album: dbRefs.albumImage,
        achievements: dbRefs.achievement,
        excuses: dbRefs.excuse,
        complaints: dbRefs.complaint,
        feedback: dbRefs.feedbackItem,
        campaigns: dbRefs.campaign,
        journal: dbRefs.journalEntry
    };

    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    const retryWithBackoff = async (fn: () => Promise<void>, maxAttempts = 3, baseDelay = 300) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await fn();
                return;
            } catch (err) {
                if (attempt === maxAttempts) throw err;
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.warn(`Retrying sync (attempt ${attempt}/${maxAttempts}) in ${delay}ms`);
                await sleep(delay);
            }
        }
    };
    
    for (const item of pending) {
        try {
            const refFn = refMap[item.collection];
            if (!refFn) continue;
            
            if (item.action === 'delete') {
                await retryWithBackoff(() => dbHelpers.removeData(refFn(item.docId)));
            } else {
                await retryWithBackoff(() => dbHelpers.setData(refFn(item.docId), item.data));
            }
            
            if (item.id) syncedIds.push(item.id);
        } catch (error) {
            console.error('Sync error for item:', item, error);
        }
    }
    
    if (syncedIds.length > 0) {
        await markAsSynced(syncedIds);
        console.log(`Synced ${syncedIds.length} changes to Firebase`);
    }

    pendingSyncCount = await getPendingSyncItems().then(items => items.length);
    lastSyncAt = Date.now();
};

// --- Setup Firebase real-time listeners ---
const setupFirebaseListeners = () => {
    // Users
    onValue(dbRefs.users(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const users = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.users, users);
        }
    });

    // Todos
    onValue(dbRefs.todos(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const todos = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.todos, todos);
        }
    });

    // Transactions
    onValue(dbRefs.transactions(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const txs = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.transactions, txs);
        }
    });

    // Attendance
    onValue(dbRefs.attendance(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const records = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.attendance, records);
        }
    });

    // Announcements
    onValue(dbRefs.announcements(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const announcements = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.announcements, announcements);
        }
    });

    // Schedule
    onValue(dbRefs.schedule(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const schedule = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.schedule, schedule);
        }
    });

    // Settings
    onValue(dbRefs.settings(), async (snapshot) => {
        if (snapshot.exists()) {
            const settings = { ...snapshot.val(), id: 'main' };
            const existing = await db.settings.get('main');
            if (!existing || isNewer(settings as any, existing as any)) {
                await db.settings.put(settings);
                window.dispatchEvent(new Event('settingsUpdated'));
            }
        }
    });

    // Album
    onValue(dbRefs.album(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const album = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.album, album);
        }
    });

    // Achievements
    onValue(dbRefs.achievements(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const achievements = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.achievements, achievements);
        }
    });

    // Excuses
    onValue(dbRefs.excuses(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const excuses = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.excuses, excuses);
        }
    });

    // Complaints
    onValue(dbRefs.complaints(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const complaints = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.complaints, complaints);
        }
    });

    // Feedback
    onValue(dbRefs.feedback(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const feedbacks = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.feedback, feedbacks);
        }
    });

    // Campaigns
    onValue(dbRefs.campaigns(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const campaigns = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.campaigns, campaigns);
        }
    });

    // Journal
    onValue(dbRefs.journal(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const journal = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.journal, journal);
        }
    });

    // Logs
    onValue(dbRefs.logs(), async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const logs = Object.keys(data).map(key => ({ ...data[key], id: key }));
            await applyIncomingList(db.logs, logs);
        }
    });
};

// --- Initialize Firebase sync ---
const initFirebaseSync = async () => {
    try {
        // Check if Firebase has data
        const existingUsers = await dbHelpers.getAll<User>(dbRefs.users());
        
        if (existingUsers.length === 0) {
            console.log('Syncing Dexie data to Firebase...');
            
            // Sync from Dexie to Firebase
            const users = await db.users.toArray();
            for (const user of users) {
                await dbHelpers.setData(dbRefs.user(user.id), user);
            }
            
            const announcements = await db.announcements.toArray();
            for (const ann of announcements) {
                await dbHelpers.setData(dbRefs.announcement(ann.id), ann);
            }
            
            const schedule = await db.schedule.toArray();
            for (const item of schedule) {
                await dbHelpers.setData(dbRefs.scheduleItem(item.id), item);
            }
            
            const settings = await db.settings.get('main');
            if (settings) {
                const { id, ...settingsData } = settings as ClassSettings & { id: string };
                await dbHelpers.setData(dbRefs.settings(), settingsData);
            }
            
            const album = await db.album.toArray();
            for (const img of album) {
                await dbHelpers.setData(dbRefs.albumImage(img.id), img);
            }
            
            const achievements = await db.achievements.toArray();
            for (const ach of achievements) {
                await dbHelpers.setData(dbRefs.achievement(ach.id), ach);
            }
            
            const campaigns = await db.campaigns.toArray();
            for (const camp of campaigns) {
                await dbHelpers.setData(dbRefs.campaign(camp.id), camp);
            }
            
            console.log('Dexie data synced to Firebase!');
        }
        
        setupFirebaseListeners();
        console.log('Firebase real-time sync enabled');
        
        // Sync any pending offline changes
        await syncPendingChanges();
        
    } catch (error) {
        console.error('Firebase sync error:', error);
    }
};

// --- Initialize ---
const initialize = async () => {
    await initializeMockData();
    
    if (isOnline()) {
        await initFirebaseSync();
    }
    
    // Listen for online/offline events
    window.addEventListener('online', async () => {
        console.log('Back online! Syncing pending changes...');
        await syncPendingChanges();
        await initFirebaseSync();
    });
    
    window.addEventListener('offline', () => {
        console.log('Offline mode - changes will sync when back online');
    });
};

initialize();

// --- Auth Services ---
export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
};

export const login = async (identifier: string, _pass: string): Promise<User | null> => {
    const user = await db.users
        .filter(u => u.username === identifier || u.email === identifier)
        .first();
    
    if (user && user.status === 'active') {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        await logAccess(user.id, 'LOGIN', 'User logged in');
        return user;
    }
    return null;
};

export const registerUser = async (user: User) => {
    await putVersioned(db.users, user);
    await syncToFirebase(dbRefs.user, user, 'users');
    await logAccess('SYSTEM', 'REGISTER', `New user registered: ${user.username}`);
};

// --- User Services ---
export const getUsers = async (): Promise<User[]> => {
    return await db.users.toArray();
};

export const updateUser = async (updatedUser: User) => {
    await putVersioned(db.users, updatedUser);
    await syncToFirebase(dbRefs.user, updatedUser, 'users');
    
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === updatedUser.id) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
};

// --- Todo Services ---
export const getTodos = async (): Promise<ToDoItem[]> => {
    return await db.todos.toArray();
};

export const saveTodo = async (todo: ToDoItem) => {
    await putVersioned(db.todos, todo);
    await syncToFirebase(dbRefs.todo, todo, 'todos');
};

export const deleteTodo = async (todoId: string) => {
    await db.todos.delete(todoId);
    await deleteFromFirebase(dbRefs.todo, todoId, 'todos');
};

// --- Transaction Services ---
export const getTransactions = async (): Promise<Transaction[]> => {
    return await db.transactions.toArray();
};

export const addTransaction = async (tx: Transaction) => {
    await putVersioned(db.transactions, tx);
    await syncToFirebase(dbRefs.transaction, tx, 'transactions');
};

export const deleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
    await deleteFromFirebase(dbRefs.transaction, id, 'transactions');
};

export const updateTransaction = async (tx: Transaction) => {
    await putVersioned(db.transactions, tx);
    await syncToFirebase(dbRefs.transaction, tx, 'transactions');
};

// --- Campaign Services ---
export const getCampaigns = async (): Promise<Campaign[]> => {
    return await db.campaigns.toArray();
};

export const saveCampaign = async (camp: Campaign) => {
    await putVersioned(db.campaigns, camp);
    await syncToFirebase(dbRefs.campaign, camp, 'campaigns');
};

// --- Attendance Services ---
export const getAttendance = async (): Promise<AttendanceRecord[]> => {
    return await db.attendance.toArray();
};

export const getAttendanceByStudent = async (studentId: string): Promise<AttendanceRecord[]> => {
    return await db.attendance.where('studentId').equals(studentId).toArray();
};

export const saveAttendance = async (records: AttendanceRecord[]) => {
    await bulkPutVersioned(db.attendance, records);
    for (const record of records) {
        await syncToFirebase(dbRefs.attendanceRecord, record, 'attendance');
    }
};

export const updateAttendanceRecord = async (record: AttendanceRecord) => {
    await putVersioned(db.attendance, record);
    await syncToFirebase(dbRefs.attendanceRecord, record, 'attendance');
};

// --- Excuse Services ---
export const getExcuseRequests = async (): Promise<ExcuseRequest[]> => {
    return await db.excuses.toArray();
};

export const addExcuseRequest = async (req: ExcuseRequest) => {
    await putVersioned(db.excuses, req);
    await syncToFirebase(dbRefs.excuse, req, 'excuses');
};

export const updateExcuseStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const excuse = await db.excuses.get(id);
    if (excuse) {
        excuse.status = status;
        await putVersioned(db.excuses, excuse);
        await syncToFirebase(dbRefs.excuse, excuse, 'excuses');
    }
};

// --- Complaint Services ---
export const getComplaints = async (): Promise<AttendanceComplaint[]> => {
    return await db.complaints.toArray();
};

export const fileComplaint = async (comp: AttendanceComplaint) => {
    await putVersioned(db.complaints, comp);
    await syncToFirebase(dbRefs.complaint, comp, 'complaints');
};

export const resolveComplaint = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const complaint = await db.complaints.get(id);
    if (complaint) {
        complaint.status = status;
        await putVersioned(db.complaints, complaint);
        await syncToFirebase(dbRefs.complaint, complaint, 'complaints');
    }
};

// --- Attendance Report ---
export const generateAttendanceReport = async (date: string): Promise<string> => {
    const allRecords = await getAttendance();
    const dayRecords = allRecords.filter(r => r.date === date);
    const users = (await getUsers()).filter(u => u.role === UserRole.STUDENT);
    
    const present = dayRecords.filter(r => r.status === 'PRESENT').length;
    const late = dayRecords.filter(r => r.status === 'LATE');
    const absent = dayRecords.filter(r => r.status === 'ABSENT');
    const excused = dayRecords.filter(r => r.status === 'EXCUSED');
    
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

// --- Log Services ---
export const getLogs = async (): Promise<AccessLog[]> => {
    return await db.logs.orderBy('timestamp').reverse().toArray();
};

export const logAccess = async (userId: string, action: string, details: string) => {
    const log: AccessLog = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        userId,
        action,
        details
    };
    await db.logs.put(log);
    await syncToFirebase(dbRefs.log, log, 'logs');
};

// --- Announcement Services ---
export const getAnnouncements = async (): Promise<Announcement[]> => {
    return await db.announcements.orderBy('date').reverse().toArray();
};

export const addAnnouncement = async (ann: Announcement) => {
    await putVersioned(db.announcements, ann);
    await syncToFirebase(dbRefs.announcement, ann, 'announcements');
};

// --- Schedule Services ---
export const getSchedule = async (): Promise<ClassSchedule[]> => {
    return await db.schedule.toArray();
};

export const saveScheduleItem = async (item: ClassSchedule) => {
    await putVersioned(db.schedule, item);
    await syncToFirebase(dbRefs.scheduleItem, item, 'schedule');
};

export const deleteScheduleItem = async (id: string) => {
    await db.schedule.delete(id);
    await deleteFromFirebase(dbRefs.scheduleItem, id, 'schedule');
};

// Settings with ID for Dexie storage
interface SettingsWithId extends ClassSettings {
    id: string;
}

// --- Settings Services ---
export const getSettings = async (): Promise<ClassSettings> => {
    const settings = await db.settings.get('main') as SettingsWithId | undefined;
    if (settings) {
        const { id, ...rest } = settings;
        return rest as ClassSettings;
    }
    return {
        logoUrl: LOGO_URL,
        className: APP_NAME,
        academicYear: '2023-2024'
    };
};

export const updateSettings = async (settings: ClassSettings) => {
    const versionedSettings = withVersion({ ...settings, id: 'main' } as any);
    await db.settings.put(versionedSettings);
    if (isOnline()) {
        try {
            await dbHelpers.setData(dbRefs.settings(), versionedSettings);
        } catch (error) {
            console.error('Settings sync error:', error);
        }
    }
    window.dispatchEvent(new Event('settingsUpdated'));
};

// --- Album Services ---
export const getAlbum = async (): Promise<AlbumImage[]> => {
    return await db.album.orderBy('date').reverse().toArray();
};

export const saveAlbum = async (album: AlbumImage[]) => {
    await bulkPutVersioned(db.album, album);
    for (const img of album) {
        await syncToFirebase(dbRefs.albumImage, img, 'album');
    }
};

// --- Achievement Services ---
export const getAchievements = async (): Promise<Achievement[]> => {
    return await db.achievements.toArray();
};

export const saveAchievements = async (ach: Achievement[]) => {
    await bulkPutVersioned(db.achievements, ach);
    for (const a of ach) {
        await syncToFirebase(dbRefs.achievement, a, 'achievements');
    }
};

// --- Feedback Services ---
export const getFeedbacks = async (): Promise<Feedback[]> => {
    return await db.feedback.orderBy('date').reverse().toArray();
};

export const saveFeedback = async (feedback: Feedback) => {
    await putVersioned(db.feedback, feedback);
    await syncToFirebase(dbRefs.feedbackItem, feedback, 'feedback');
};

// --- Static Resources ---
export const getResources = (): Resource[] => [
    { id: '1', title: 'Filipino 1 Syllabus', type: 'PDF', url: '#', description: 'Course outline and grading system', dateAdded: Date.now() - 10000000 },
    { id: '2', title: 'Noli Me Tangere - Chapter 1-5', type: 'PDF', url: '#', description: 'Reading materials for next week', dateAdded: Date.now() - 500000 },
    { id: '3', title: 'Group Project Guidelines', type: 'DOC', url: '#', description: 'Instructions for the final project', dateAdded: Date.now() }
];

export const getGrades = (_userId: string): Grade[] => [
    { id: 'g1', subject: 'Filipino 1', quarter: '1st', score: 92, weight: 25, type: 'WRITTEN', date: '2023-09-15' },
    { id: 'g2', subject: 'Filipino 1', quarter: '1st', score: 88, weight: 40, type: 'PERFORMANCE', date: '2023-09-20' },
    { id: 'g3', subject: 'Komunikasyon', quarter: '1st', score: 95, weight: 30, type: 'EXAM', date: '2023-10-05' },
    { id: 'g4', subject: 'Kasaysayan', quarter: '1st', score: 85, weight: 20, type: 'WRITTEN', date: '2023-09-10' },
];

// --- Media Upload Service ---
export const uploadMedia = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- Journal Services ---
export const getJournalEntries = async (userId: string): Promise<JournalEntry[]> => {
    return await db.journal
        .where('userId').equals(userId)
        .reverse()
        .sortBy('createdAt');
};

export const getJournalEntryByDate = async (userId: string, date: string): Promise<JournalEntry | null> => {
    return await db.journal
        .where(['userId', 'date'])
        .equals([userId, date])
        .first() || null;
};

export const saveJournalEntry = async (entry: JournalEntry) => {
    const updatedEntry = withVersion({ ...entry, updatedAt: Date.now() });
    await db.journal.put(updatedEntry);
    await syncToFirebase(dbRefs.journalEntry, updatedEntry, 'journal');
};

export const deleteJournalEntry = async (entryId: string) => {
    await db.journal.delete(entryId);
    await deleteFromFirebase(dbRefs.journalEntry, entryId, 'journal');
};

export const searchJournalEntries = async (userId: string, query: string): Promise<JournalEntry[]> => {
    const entries = await getJournalEntries(userId);
    const lowerQuery = query.toLowerCase();
    return entries.filter(entry =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery) ||
        entry.lessons.toLowerCase().includes(lowerQuery) ||
        entry.date.includes(query) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
};

// --- Sync Helpers for Components ---
export { isOnline } from './db';
export const getPendingSyncCount = () => pendingSyncCount;
export const getLastSyncAt = () => lastSyncAt;
