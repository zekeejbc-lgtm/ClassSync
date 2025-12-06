import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove, update, onValue, off, DataSnapshot } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Firebase configuration - uses environment variables with fallback to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA461N1_QS1gpHMpQPqQfQyQEjRvpmS1Jc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "classsync-d900e.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://classsync-d900e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "classsync-d900e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "classsync-d900e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "730730524428",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:730730524428:web:4f35a4c3b9dcbe6c976329",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-507HC15HCW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Database references
export const dbRefs = {
  users: () => ref(database, 'users'),
  user: (id: string) => ref(database, `users/${id}`),
  todos: () => ref(database, 'todos'),
  todo: (id: string) => ref(database, `todos/${id}`),
  transactions: () => ref(database, 'transactions'),
  transaction: (id: string) => ref(database, `transactions/${id}`),
  attendance: () => ref(database, 'attendance'),
  attendanceRecord: (id: string) => ref(database, `attendance/${id}`),
  logs: () => ref(database, 'logs'),
  log: (id: string) => ref(database, `logs/${id}`),
  announcements: () => ref(database, 'announcements'),
  announcement: (id: string) => ref(database, `announcements/${id}`),
  schedule: () => ref(database, 'schedule'),
  scheduleItem: (id: string) => ref(database, `schedule/${id}`),
  settings: () => ref(database, 'settings'),
  album: () => ref(database, 'album'),
  albumImage: (id: string) => ref(database, `album/${id}`),
  achievements: () => ref(database, 'achievements'),
  achievement: (id: string) => ref(database, `achievements/${id}`),
  excuses: () => ref(database, 'excuses'),
  excuse: (id: string) => ref(database, `excuses/${id}`),
  complaints: () => ref(database, 'complaints'),
  complaint: (id: string) => ref(database, `complaints/${id}`),
  feedback: () => ref(database, 'feedback'),
  feedbackItem: (id: string) => ref(database, `feedback/${id}`),
  campaigns: () => ref(database, 'campaigns'),
  campaign: (id: string) => ref(database, `campaigns/${id}`),
  journal: () => ref(database, 'journal'),
  journalEntry: (id: string) => ref(database, `journal/${id}`),
  applications: () => ref(database, 'applications'),
  application: (id: string) => ref(database, `applications/${id}`),
  
  // School Structure References
  schools: () => ref(database, 'schools'),
  school: (id: string) => ref(database, `schools/${id}`),
  departments: () => ref(database, 'departments'),
  department: (id: string) => ref(database, `departments/${id}`),
  colleges: () => ref(database, 'colleges'),
  college: (id: string) => ref(database, `colleges/${id}`),
  programs: () => ref(database, 'programs'),
  program: (id: string) => ref(database, `programs/${id}`),
  majors: () => ref(database, 'majors'),
  major: (id: string) => ref(database, `majors/${id}`),
  tracks: () => ref(database, 'tracks'),
  track: (id: string) => ref(database, `tracks/${id}`),
  strands: () => ref(database, 'strands'),
  strand: (id: string) => ref(database, `strands/${id}`),
  yearLevels: () => ref(database, 'yearLevels'),
  yearLevel: (id: string) => ref(database, `yearLevels/${id}`),
  sections: () => ref(database, 'sections'),
  section: (id: string) => ref(database, `sections/${id}`),
};

// Helper functions for database operations
export const dbHelpers = {
  // Get all items from a reference
  async getAll<T>(refPath: ReturnType<typeof ref>): Promise<T[]> {
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ ...data[key], id: key }));
  },

  // Get single item
  async getOne<T>(refPath: ReturnType<typeof ref>): Promise<T | null> {
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return null;
    return snapshot.val();
  },

  // Set data (overwrite)
  async setData<T>(refPath: ReturnType<typeof ref>, data: T): Promise<void> {
    await set(refPath, data);
  },

  // Push new item (auto-generate ID)
  async pushData<T>(refPath: ReturnType<typeof ref>, data: T): Promise<string> {
    const newRef = push(refPath);
    await set(newRef, data);
    return newRef.key!;
  },

  // Update existing item
  async updateData<T>(refPath: ReturnType<typeof ref>, data: Partial<T>): Promise<void> {
    await update(refPath, data as object);
  },

  // Remove item
  async removeData(refPath: ReturnType<typeof ref>): Promise<void> {
    await remove(refPath);
  },

  // Subscribe to real-time updates
  subscribe(refPath: ReturnType<typeof ref>, callback: (snapshot: DataSnapshot) => void): () => void {
    onValue(refPath, callback);
    return () => off(refPath);
  }
};

// Auth helpers
export const authHelpers = {
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async signUp(email: string, password: string): Promise<FirebaseUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async signOut(): Promise<void> {
    await signOut(auth);
  },

  onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
};

export { database, auth, app };
export { ref, get, set, push, remove, update, onValue, off };
