
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { login, registerUser, getSettings } from '../services/dataService';
import { Lock, User as UserIcon, ShieldAlert, ArrowRight, Home } from 'lucide-react';
import Registration from './Registration';
import { useToast } from './ui/Toast';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const { showToast } = useToast();
  
  // Login State
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [error, setError] = useState('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [isResetStep, setIsResetStep] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [appName, setAppName] = useState('');

  useEffect(() => {
      const settings = getSettings();
      setLogoUrl(settings.logoUrl);
      setAppName(settings.className);
  }, []);

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(loginId, loginPass);
    if (user) {
      onLogin(user);
      navigate('/dashboard');
    } else {
      setError('Invalid credentials or account suspended.');
    }
  };

  // Handle registration/application complete
  const handleRegistrationComplete = (result: any) => {
    // Check if this is an application (not a direct registration)
    if (result.isApplication) {
      // Application submitted - show pending message via toast
      showToast('Application submitted! Pending admin approval.', 'success');
      setView('login');
      return;
    }
    
    // Legacy: Direct registration (if admin approves instantly or for backward compatibility)
    const newUser: User = {
      id: result.idCode || result.id,
      email: result.email,
      username: result.username,
      fullName: result.fullName,
      role: UserRole.STUDENT,
      status: 'active',
      avatar: result.avatar || ''
    };
    registerUser(newUser);
    showToast(`Registration Successful! Your ID Code is: ${result.idCode || result.id}`, 'success');
    setView('login');
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    showToast(`Recovery code sent! Code: ${code}`, 'info');
    setIsResetStep(true);
  };

  const completeReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode === generatedCode) {
        showToast('Password changed successfully!', 'success');
        setView('login');
        setIsResetStep(false);
    } else {
        setError('Invalid recovery code');
    }
  };

  // If registering, render full-page Registration component
  if (view === 'register') {
    return (
      <Registration
        onComplete={handleRegistrationComplete}
        onCancel={() => setView('login')}
        logoUrl={logoUrl}
        appName={appName}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-200 dark:bg-stone-900 p-4 transition-colors">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in border border-stone-200 dark:border-stone-700">
        {/* Header */}
        <div className="bg-[#3E2723] dark:bg-black p-8 text-center relative overflow-hidden">
          <div className="absolute top-4 left-4 z-20">
              <button onClick={() => navigate('/')} className="text-white/70 hover:text-white flex items-center text-xs font-bold uppercase tracking-wider">
                  <Home size={14} className="mr-1" /> Home
              </button>
          </div>
          <div className="relative z-10 flex flex-col items-center mt-2">
            <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-full border-4 border-amber-600 mb-4 shadow-lg object-cover bg-white" />
            <h1 className="text-xl font-bold font-display text-amber-50 tracking-tight leading-snug">{appName}</h1>
            <p className="text-amber-200/80 text-xs mt-1 uppercase tracking-wider font-semibold">Student Portal</p>
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-600 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-800 rounded-full blur-3xl opacity-20"></div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center border border-red-100 dark:border-red-800">
              <ShieldAlert className="w-4 h-4 mr-2" /> {error}
            </div>
          )}

          {view === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-800 dark:text-white mb-4">Sign In</h2>
                <div>
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Username or Email</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-700 dark:text-white"
                      placeholder="Enter your ID or Email"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input 
                      type="password" 
                      required
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-700 dark:text-white"
                      placeholder="Enter password"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <button type="button" onClick={() => setView('forgot')} className="text-amber-700 dark:text-amber-500 hover:text-amber-900 dark:hover:text-amber-400 font-medium">Forgot password?</button>
                </div>

                <button type="submit" className="w-full bg-[#4a3728] hover:bg-[#3E2723] text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-stone-900/10 flex items-center justify-center">
                  Log In <ArrowRight size={18} className="ml-2"/>
                </button>
              </form>
              
              <div className="text-center mt-4 text-sm text-stone-500 dark:text-stone-400">
                Don't have an account? <button type="button" onClick={() => { setView('register'); }} className="text-amber-700 dark:text-amber-500 font-bold hover:underline">Register</button>
              </div>
            </div>
          )}

          {view === 'forgot' && (
              <form onSubmit={isResetStep ? completeReset : handleForgot} className="space-y-4 animate-in">
                  <h2 className="text-xl font-semibold text-stone-800 dark:text-white mb-4">Reset Password</h2>
                  {!isResetStep ? (
                      <>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">Enter your email address and we'll send you a code to reset your password.</p>
                        <div className="relative">
                          <input type="email" required placeholder="Enter your email" className="w-full px-4 py-2.5 border-2 border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-700 dark:text-white" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                        </div>
                        <button type="submit" className="w-full bg-[#4a3728] hover:bg-[#3E2723] text-white font-bold py-2.5 rounded-lg transition-colors">Send Recovery Code</button>
                      </>
                  ) : (
                      <>
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-sm mb-2 border-2 border-amber-200 dark:border-amber-800">
                             Code sent to <strong>{forgotEmail}</strong>.
                        </div>
                        <input type="text" required placeholder="Verification Code" className="w-full px-4 py-2.5 border-2 border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-700 dark:text-white text-center tracking-widest" value={resetCode} onChange={e => setResetCode(e.target.value)} />
                        <input type="password" required placeholder="New Password" className="w-full px-4 py-2.5 border-2 border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-700 dark:text-white" value={newPass} onChange={e => setNewPass(e.target.value)} />
                        <button type="submit" className="w-full bg-[#4a3728] hover:bg-[#3E2723] text-white font-bold py-2.5 rounded-lg transition-colors">Change Password</button>
                      </>
                  )}
                  <button type="button" onClick={() => { setView('login'); setIsResetStep(false); }} className="mt-6 text-sm text-stone-500 dark:text-stone-400 w-full text-center hover:text-amber-600 transition-colors">Back to Login</button>
              </form>
          )}
        </div>
      </div>
    </div>
  );
};
