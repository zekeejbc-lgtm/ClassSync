
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Home, CheckSquare, DollarSign, Calendar, 
  Users, UserCheck, ShieldAlert, LogOut, Bell, User as UserIcon, Moon, Sun,
  BookOpen, FileText, GraduationCap, Globe, BookMarked, ClipboardList
} from 'lucide-react';
import { User, UserRole } from '../types';
import { PERMISSIONS } from '../constants';
import { getSettings } from '../services/dataService';
import { useTheme } from './ThemeContext';

// Helper to transform Google Drive URLs for better image embedding
const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    
    let fileId = '';
    
    if (url.includes('drive.google.com/uc?export=view&id=')) {
        fileId = url.split('id=')[1]?.split('&')[0] || '';
    } else if (url.includes('drive.google.com/thumbnail?id=')) {
        fileId = url.split('id=')[1]?.split('&')[0] || '';
    } else if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/file\/d\/([^\/]+)/);
        if (match) fileId = match[1];
    }
    
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }
    
    return url;
};

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

type MenuSection = {
  title?: string;
  items: { label: string; path: string; icon: React.ReactNode }[];
};

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState(getSettings());

  // Listen for storage changes to update logo real-time
  useEffect(() => {
    const handleStorageChange = () => setSettings(getSettings());
    window.addEventListener('storage', handleStorageChange);
    // Custom event for internal updates
    window.addEventListener('settingsUpdated', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('settingsUpdated', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    onLogout();
  };

  const menuSections: MenuSection[] = [
    {
        title: 'Main',
        items: [
            { label: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
            { label: 'Announcements', path: '/announcements', icon: <Bell size={20} /> },
            { label: 'My Profile', path: '/profile', icon: <UserIcon size={20} /> },
        ]
    },
    {
        title: 'Academic',
        items: [
            { label: 'Tasks & Homework', path: '/todo', icon: <CheckSquare size={20} /> },
            { label: 'Class Schedule', path: '/schedule', icon: <Calendar size={20} /> },
            { label: 'Class Resources', path: '/resources', icon: <FileText size={20} /> },
            { label: 'My Grades', path: '/grades', icon: <GraduationCap size={20} /> },
            { label: 'Reflection Journal', path: '/journal', icon: <BookMarked size={20} /> },
        ]
    }
  ];

  // Management Section
  const mgmtItems = [];
  
  if (PERMISSIONS.CAN_MANAGE_FINANCE.includes(user.role)) {
    mgmtItems.push({ label: 'Finance Management', path: '/finance', icon: <DollarSign size={20} /> });
  } else {
    mgmtItems.push({ label: 'Class Funds', path: '/finance', icon: <DollarSign size={20} /> });
  }

  if (PERMISSIONS.CAN_TAKE_ATTENDANCE.includes(user.role) || user.role === UserRole.STUDENT) {
    mgmtItems.push({ label: 'Attendance', path: '/attendance', icon: <UserCheck size={20} /> });
  }

  if (PERMISSIONS.CAN_MANAGE_USERS.includes(user.role)) {
    mgmtItems.push({ label: 'Members & Settings', path: '/members', icon: <Users size={20} /> });
  }

  if (user.role === UserRole.ADMIN) {
    mgmtItems.push({ label: 'Applications', path: '/applications', icon: <ClipboardList size={20} /> });
  }

  if (PERMISSIONS.CAN_MANAGE_PUBLIC.includes(user.role)) {
    mgmtItems.push({ label: 'Public Portal', path: '/public-portal', icon: <Globe size={20} /> });
  }

  if (mgmtItems.length > 0) {
      menuSections.push({ title: 'Management', items: mgmtItems });
  }

  // System Section
  const systemItems = [];
  if (PERMISSIONS.CAN_VIEW_LOGS.includes(user.role)) {
    systemItems.push({ label: 'System Logs', path: '/logs', icon: <ShieldAlert size={20} /> });
  }
  
  if (systemItems.length > 0) {
      menuSections.push({ title: 'System', items: systemItems });
  }

  // Flatten items for finding current title
  const allItems = menuSections.flatMap(s => s.items);

  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden transition-colors duration-300 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-[#292524] dark:bg-black text-white transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0 border-r border-stone-800 dark:border-stone-800 shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="flex items-center space-x-3 p-5 border-b border-stone-800 dark:border-stone-800 bg-[#1c1917] dark:bg-stone-950">
          <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-amber-600 shadow-lg" />
          <span className="text-sm font-bold font-display tracking-tight leading-tight text-amber-50">{settings.className}</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-stone-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-[#292524] dark:bg-stone-950">
          <div className="mb-6 px-2">
            <div 
                className="flex items-center space-x-3 bg-stone-800/50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-700 dark:border-stone-800 cursor-pointer hover:bg-stone-800 dark:hover:bg-stone-800 transition-colors group"
                onClick={() => navigate('/profile')}
            >
              <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center text-sm font-bold overflow-hidden border-2 border-amber-900/50 group-hover:border-amber-500 transition-colors relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    {user.username.substring(0,2).toUpperCase()}
                </div>
                <img 
                    src={getImageUrl(user.avatar)} 
                    alt={user.username} 
                    className="absolute inset-0 w-full h-full object-cover z-10" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate text-amber-50 group-hover:text-amber-400 transition-colors">{user.fullName}</p>
                <p className="text-xs text-stone-400 truncate">{user.role}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-6">
            {menuSections.map((section, idx) => (
                <div key={idx}>
                    {section.title && (
                        <h3 className="px-4 text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                            {section.title}
                        </h3>
                    )}
                    <div className="space-y-1">
                        {section.items.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                            navigate(item.path);
                            setSidebarOpen(false);
                            }}
                            className={`
                            w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
                            ${location.pathname === item.path 
                                ? 'bg-amber-700 text-white shadow-lg shadow-amber-900/40 translate-x-1 font-semibold' 
                                : 'text-stone-300 dark:text-stone-400 hover:bg-stone-800 dark:hover:bg-stone-900 hover:text-amber-200 hover:translate-x-1'}
                            `}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                        ))}
                    </div>
                </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-stone-800 dark:border-stone-900 bg-[#1c1917] dark:bg-stone-950">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-900/20 text-red-300 hover:bg-red-900 hover:text-white px-4 py-3 rounded-lg transition-all duration-200 group border border-red-900/30"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-stone-900 shadow-sm h-16 flex items-center justify-between px-4 lg:px-8 relative z-10 transition-colors duration-300 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center">
            <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-stone-600 dark:text-stone-200 hover:text-amber-700 mr-4 p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800"
            >
                <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold font-display text-stone-800 dark:text-amber-50 truncate hidden sm:block">
                {allItems.find(m => m.path === location.pathname)?.label}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Toggle Theme"
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-amber-400"/>}
            </button>

            <div className="text-right hidden sm:block bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700">
               <span className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
                   {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-stone-50 dark:bg-stone-950 p-4 lg:p-8 transition-colors duration-300">
          <div className="max-w-7xl mx-auto animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;