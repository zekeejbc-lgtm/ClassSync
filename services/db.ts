import Dexie, { Table } from 'dexie';
import { 
    User, ToDoItem, Transaction, AttendanceRecord, AccessLog, 
    Announcement, ClassSchedule, ClassSettings, AlbumImage, 
    Achievement, ExcuseRequest, AttendanceComplaint, Feedback, 
    Campaign, JournalEntry 
} from '../types';

// Sync queue item for offline changes (using 0/1 for IndexedDB compatibility)
export interface SyncQueueItem {
    id?: number;
    action: 'create' | 'update' | 'delete';
    collection: string;
    docId: string;
    data?: any;
    timestamp: number;
    synced: number; // 0 = false, 1 = true (for IndexedDB indexing)
}

// Define the database
class ClassSyncDatabase extends Dexie {
    users!: Table<User, string>;
    todos!: Table<ToDoItem, string>;
    transactions!: Table<Transaction, string>;
    attendance!: Table<AttendanceRecord, string>;
    logs!: Table<AccessLog, string>;
    announcements!: Table<Announcement, string>;
    schedule!: Table<ClassSchedule, string>;
    settings!: Table<ClassSettings, string>;
    album!: Table<AlbumImage, string>;
    achievements!: Table<Achievement, string>;
    excuses!: Table<ExcuseRequest, string>;
    complaints!: Table<AttendanceComplaint, string>;
    feedback!: Table<Feedback, string>;
    campaigns!: Table<Campaign, string>;
    journal!: Table<JournalEntry, string>;
    syncQueue!: Table<SyncQueueItem, number>;

    constructor() {
        super('ClassSyncDB');
        
        this.version(1).stores({
            users: 'id, username, email, role, status',
            todos: 'id, type, createdBy, assignee, isCompleted, deadline, category',
            transactions: 'id, type, date, recordedBy, campaignId, studentId',
            attendance: 'id, date, studentId, status, recordedBy',
            logs: 'id, timestamp, userId, action',
            announcements: 'id, date, authorId, category',
            schedule: 'id, day, subject',
            settings: 'id',
            album: 'id, date',
            achievements: 'id, date',
            excuses: 'id, studentId, status, dateFiled',
            complaints: 'id, studentId, status, dateFiled',
            feedback: 'id, date, isRead',
            campaigns: 'id, status, createdBy',
            journal: 'id, userId, date, createdAt',
            syncQueue: '++id, collection, docId, synced, timestamp'
        });
    }
}

// Create database instance
export const db = new ClassSyncDatabase();

// Add to sync queue for offline changes
export const addToSyncQueue = async (
    action: 'create' | 'update' | 'delete',
    collection: string,
    docId: string,
    data?: any
) => {
    await db.syncQueue.add({
        action,
        collection,
        docId,
        data,
        timestamp: Date.now(),
        synced: 0
    });
};

// Get pending sync items
export const getPendingSyncItems = async (): Promise<SyncQueueItem[]> => {
    return await db.syncQueue.where('synced').equals(0).toArray();
};

// Mark items as synced
export const markAsSynced = async (ids: number[]) => {
    await db.syncQueue.where('id').anyOf(ids).modify({ synced: 1 });
};

// Clear synced items
export const clearSyncedItems = async () => {
    await db.syncQueue.where('synced').equals(1).delete();
};

// Check if online
export const isOnline = (): boolean => {
    return navigator.onLine;
};

// Initialize database with data
export const initializeDatabase = async () => {
    const userCount = await db.users.count();
    if (userCount === 0) {
        console.log('Initializing Dexie database...');
        // Data will be synced from Firebase or localStorage
    }
};

export default db;
