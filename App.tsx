
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Auth } from './components/Auth';
import Dashboard from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { TodoModule, ScheduleModule, AnnouncementModule, ResourcesModule, GradesModule } from './components/Modules';
import { MemberManagement, FinanceModule, AttendanceModule, AccessLogs, PublicPortalManagement, ApplicationManagement } from './components/Management';
import { Profile } from './components/Profile';
import { JournalModule } from './components/Journal';
import { User, UserRole } from './types';
import { getCurrentUser, logout, getSettings } from './services/dataService';
import { PERMISSIONS } from './constants';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './components/ThemeContext';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { ConnectionStatus } from './components/ui/ConnectionStatus';
import Registration from './components/Registration';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  user: User;
}

const ProtectedRoute = ({ children, allowedRoles, user }: ProtectedRouteProps) => {
     if (allowedRoles && !allowedRoles.includes(user.role)) {
         return <div className="flex flex-col items-center justify-center h-96 text-center dark:text-slate-200">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Access Denied</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">You do not have permission to view this page.</p>
         </div>;
     }
     return <>{children}</>;
};

// Wrapper component for Registration that handles navigation state
const RegisterPage: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const location = useLocation();
    const settings = getSettings();
    
    const handleComplete = (result: any) => {
        // For applications, just navigate back - don't log in
        if (result.isApplication) {
            window.location.href = '/#/';
        } else if (result.id) {
            onLogin(result);
        }
    };
    
    return (
        <Registration
            onComplete={handleComplete}
            onCancel={() => { window.location.href = '/#/login'; }}
            logoUrl={settings.logoUrl || ''}
            appName={settings.className || 'ClassSync'}
        />
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const refreshUser = () => {
      const updated = getCurrentUser();
      if (updated) {
          setUser(updated);
      }
  };

  if (loading) return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
  );

  return (
    <ThemeProvider>
        <ToastProvider>
            <HashRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={!user ? <Auth onLogin={setUser} /> : <Navigate to="/dashboard" />} />
                    <Route path="/register" element={<RegisterPage onLogin={setUser} />} />

                    {/* Protected Routes */}
                    {user ? (
                        <>
                            <Route path="/dashboard" element={<Layout user={user} onLogout={handleLogout}><Dashboard user={user} /></Layout>} />
                            <Route path="/todo" element={<Layout user={user} onLogout={handleLogout}><TodoModule user={user} /></Layout>} />
                            <Route path="/schedule" element={<Layout user={user} onLogout={handleLogout}><ScheduleModule user={user} /></Layout>} />
                            <Route path="/announcements" element={<Layout user={user} onLogout={handleLogout}><AnnouncementModule user={user} /></Layout>} />
                            <Route path="/resources" element={<Layout user={user} onLogout={handleLogout}><ResourcesModule /></Layout>} />
                            <Route path="/grades" element={<Layout user={user} onLogout={handleLogout}><GradesModule user={user} /></Layout>} />
                            <Route path="/journal" element={<Layout user={user} onLogout={handleLogout}><JournalModule user={user} /></Layout>} />
                            <Route path="/finance" element={<Layout user={user} onLogout={handleLogout}><FinanceModule user={user} /></Layout>} />
                            <Route path="/attendance" element={<Layout user={user} onLogout={handleLogout}><AttendanceModule user={user} /></Layout>} />
                            <Route path="/profile" element={<Layout user={user} onLogout={handleLogout}><Profile user={user} onUserUpdate={refreshUser} /></Layout>} />
                            <Route path="/members" element={
                                <Layout user={user} onLogout={handleLogout}>
                                    <ProtectedRoute allowedRoles={PERMISSIONS.CAN_MANAGE_USERS} user={user}>
                                        <MemberManagement user={user} />
                                    </ProtectedRoute>
                                </Layout>
                            } />
                            <Route path="/applications" element={
                                <Layout user={user} onLogout={handleLogout}>
                                    <ProtectedRoute allowedRoles={[UserRole.ADMIN]} user={user}>
                                        <ApplicationManagement user={user} />
                                    </ProtectedRoute>
                                </Layout>
                            } />
                            <Route path="/public-portal" element={
                                <Layout user={user} onLogout={handleLogout}>
                                    <ProtectedRoute allowedRoles={PERMISSIONS.CAN_MANAGE_PUBLIC} user={user}>
                                        <PublicPortalManagement user={user} />
                                    </ProtectedRoute>
                                </Layout>
                            } />
                            <Route path="/logs" element={
                                <Layout user={user} onLogout={handleLogout}>
                                    <ProtectedRoute allowedRoles={PERMISSIONS.CAN_VIEW_LOGS} user={user}>
                                        <AccessLogs />
                                    </ProtectedRoute>
                                </Layout>
                            } />
                        </>
                    ) : (
                        // Catch-all for protected routes when not logged in -> redirect to login
                        <Route path="*" element={<Navigate to="/login" />} />
                    )}
                </Routes>
            </HashRouter>
            {/* PWA Components */}
            <OfflineIndicator />
            <InstallPrompt />
            {/* Debug/Connection Status */}
            <ConnectionStatus />
        </ToastProvider>
    </ThemeProvider>
  );
};

export default App;