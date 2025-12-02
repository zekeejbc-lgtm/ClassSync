
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Announcement, UserRole } from '../types';
import { getAnnouncements, getTodos } from '../services/dataService';
import { Bell, CheckSquare, Calendar, UserCheck, BookOpen, GraduationCap, DollarSign } from 'lucide-react';
import { LOGO_URL } from '../constants';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todoCount, setTodoCount] = useState(0);

  useEffect(() => {
    setAnnouncements(getAnnouncements());
    const todos = getTodos();
    const count = todos.filter(t => !t.isCompleted && (t.type === 'SHARED' || t.assignee === user.id)).length;
    setTodoCount(count);
  }, [user.id]);

  const getBadgeColor = (cat: string) => {
    switch(cat) {
        case 'URGENT': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        case 'ACADEMIC': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'EVENT': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
        case 'FINANCE': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
        default: return 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Modern Hero Section - Filipino Theme Gradients */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#4a3728] via-[#5D4037] to-[#8d6e63] shadow-2xl transition-all hover:shadow-stone-900/20">
         {/* Background pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 C 20 0 50 0 100 100 Z" fill="#fbbf24" />
            </svg>
        </div>
        
        <div className="relative z-10 p-8 sm:p-12 flex flex-col sm:flex-row items-center sm:justify-between">
          <div className="text-center sm:text-left text-white mb-6 sm:mb-0">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">Mabuhay, {user.username}!</h1>
            <p className="text-stone-200 text-lg max-w-xl">
              You are logged in as <span className="font-bold bg-white/20 px-3 py-0.5 rounded-full text-sm text-amber-300 backdrop-blur-sm border border-white/10">{user.role}</span>. 
              Check your schedule and pending tasks for today.
            </p>
          </div>
          <div className="hidden sm:block">
            <img src={LOGO_URL} alt="Class Logo" className="w-24 h-24 rounded-full border-4 border-amber-600 shadow-xl object-cover" />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
            onClick={() => navigate('/todo')}
            className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 rounded-lg">
            <CheckSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Pending Tasks</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-white">{todoCount}</p>
          </div>
        </div>
        
        <div 
            onClick={() => navigate('/announcements')}
            className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer"
        >
           <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <Bell size={24} />
          </div>
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Announcements</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-white">{announcements.length}</p>
          </div>
        </div>

        <div 
            onClick={() => navigate('/attendance')}
            className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer"
        >
           <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Attendance</p>
            <p className="text-lg font-bold text-stone-800 dark:text-white">Present</p>
          </div>
        </div>

        <div 
            onClick={() => navigate('/schedule')}
            className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer"
        >
           <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">Classes Today</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-white">4</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Announcements */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden transition-colors">
          <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/50">
            <h3 className="font-semibold text-stone-800 dark:text-white flex items-center">
              <Bell className="w-5 h-5 mr-2 text-red-500" /> Latest Announcements
            </h3>
            <button onClick={() => navigate('/announcements')} className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 transition-colors">View All</button>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-700">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-stone-400">No announcements yet.</div>
            ) : (
              announcements.slice(0, 3).map(ann => (
                <div 
                    key={ann.id} 
                    className="p-4 hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors cursor-pointer"
                    onClick={() => navigate('/announcements')}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-stone-900 dark:text-stone-100">{ann.title}</h4>
                        {ann.category && (
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getBadgeColor(ann.category)}`}>
                                 {ann.category}
                             </span>
                        )}
                    </div>
                    <span className="text-xs text-stone-400">{new Date(ann.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2">{ann.content}</p>
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center group">
                     Read more <span className="group-hover:translate-x-1 transition-transform ml-1">&rarr;</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / Categorized Buttons */}
        <div className="space-y-4">
             {/* Academic */}
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 transition-colors">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Academic</h3>
                <div className="space-y-2">
                    <button 
                        onClick={() => navigate('/schedule')}
                        className="w-full text-left px-4 py-2 rounded-lg bg-stone-50 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors text-sm font-medium flex items-center"
                    >
                        <Calendar size={16} className="mr-2" />
                        View My Schedule
                    </button>
                    <button 
                        onClick={() => navigate('/grades')}
                        className="w-full text-left px-4 py-2 rounded-lg bg-stone-50 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors text-sm font-medium flex items-center"
                    >
                        <GraduationCap size={16} className="mr-2" />
                        View Grades
                    </button>
                    <button 
                        onClick={() => navigate('/resources')}
                        className="w-full text-left px-4 py-2 rounded-lg bg-stone-50 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors text-sm font-medium flex items-center"
                    >
                        <BookOpen size={16} className="mr-2" />
                        Class Resources
                    </button>
                </div>
            </div>
            
            {/* Management / Admin Specific */}
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 transition-colors">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Management</h3>
                <div className="space-y-2">
                    {[UserRole.ADMIN, UserRole.SECRETARY, UserRole.MAYOR, UserRole.ASST_SECRETARY].includes(user.role) && (
                    <button 
                        onClick={() => navigate('/attendance')}
                        className="w-full text-left px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-sm font-medium flex items-center"
                    >
                        <UserCheck size={16} className="mr-2" />
                        Take Attendance
                    </button>
                    )}
                    {[UserRole.ADMIN, UserRole.TREASURER, UserRole.AUDITOR].includes(user.role) && (
                    <button 
                        onClick={() => navigate('/finance')}
                        className="w-full text-left px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-sm font-medium flex items-center"
                    >
                        <DollarSign size={16} className="mr-2" />
                        Manage Funds
                    </button>
                    )}
                     <button 
                        onClick={() => navigate('/profile')}
                        className="w-full text-left px-4 py-2 rounded-lg bg-stone-50 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors text-sm font-medium flex items-center"
                    >
                        <UserCheck size={16} className="mr-2" />
                        Update Profile
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
