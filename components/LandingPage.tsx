
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, getAlbum, getAchievements, saveFeedback, findApplications, findApplicationsRealtime, applicationProgress, getFieldIssues, updateApplicationFields } from '../services/dataService';
import { Modal } from './ui/Modal';
import { ClassSettings, AlbumImage, Achievement, Feedback, RegistrationApplication, ApplicationFieldVerifications } from '../types';
import { MapPin, Mail, Phone, ArrowRight, MessageSquare, Award, Image as ImageIcon, Menu, X, Search, User, Building2, GraduationCap, BookOpen, Users, CheckCircle2, Clock, XCircle, FileText, RefreshCcw, Sparkles, Calendar, MapPinned, AlertCircle, RotateCcw, Edit3, AlertTriangle, Send } from 'lucide-react';
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

// Field labels for display
const FIELD_LABELS: Record<string, string> = {
    studentId: 'Student ID',
    universityEmail: 'University Email',
    fullName: 'Full Name',
    avatar: 'Profile Photo',
    contactNumber: 'Contact Number',
    province: 'Province',
    city: 'City/Municipality',
    barangay: 'Barangay',
    school: 'School/University',
    college: 'College',
    program: 'Program',
    major: 'Major',
    section: 'Section',
    emergencyPerson: 'Emergency Contact Person',
    emergencyContact: 'Emergency Contact Number'
};

// Component for field correction in tracking view
const FieldCorrectionSection: React.FC<{
    app: RegistrationApplication;
    onUpdate: () => void;
}> = ({ app, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [corrections, setCorrections] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fieldIssues = getFieldIssues(app);

    // Initialize corrections with current values
    useEffect(() => {
        const initial: Record<string, string> = {};
        app.fieldsNeedingCorrection?.forEach(field => {
            initial[field] = (app as any)[field] || '';
        });
        setCorrections(initial);
    }, [app]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const result = updateApplicationFields(app.id, corrections);
            if (result) {
                setIsEditing(false);
                onUpdate();
            } else {
                setError('Failed to update. Please try again.');
            }
        } catch (e) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-2 sm:mt-3 p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2 sm:gap-3">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5 sm:hidden" />
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5 hidden sm:block" />
                <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-bold text-amber-700 dark:text-amber-400 text-sm sm:text-base">Corrections Needed</p>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                <Edit3 size={14} />
                                Update Info
                            </button>
                        )}
                    </div>
                    
                    <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-1 mb-3">
                        Please correct the following information:
                    </p>
                    
                    {!isEditing ? (
                        <div className="space-y-2">
                            {fieldIssues.map(({ field, issue }) => (
                                <div key={field} className="flex items-start gap-2 p-2 bg-white dark:bg-stone-800 rounded-lg border border-amber-200 dark:border-amber-700">
                                    <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{FIELD_LABELS[field] || field}</p>
                                        <p className="text-xs text-red-600 dark:text-red-400">{issue}</p>
                                        <p className="text-xs text-stone-500 mt-1">Current: {(app as any)[field] || 'Not provided'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {app.fieldsNeedingCorrection?.map(field => {
                                const issue = fieldIssues.find(f => f.field === field);
                                return (
                                    <div key={field} className="p-3 bg-white dark:bg-stone-800 rounded-lg border border-amber-200 dark:border-amber-700">
                                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                                            {FIELD_LABELS[field] || field}
                                        </label>
                                        {issue && (
                                            <p className="text-xs text-red-500 mb-2">Issue: {issue.issue}</p>
                                        )}
                                        {field === 'avatar' ? (
                                            <input
                                                type="url"
                                                value={corrections[field] || ''}
                                                onChange={(e) => setCorrections({ ...corrections, [field]: e.target.value })}
                                                placeholder="Enter image URL"
                                                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={corrections[field] || ''}
                                                onChange={(e) => setCorrections({ ...corrections, [field]: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                            
                            {error && (
                                <p className="text-xs text-red-600">{error}</p>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    <Send size={14} className={isSubmitting ? 'animate-pulse' : ''} />
                                    {isSubmitting ? 'Submitting...' : 'Submit Corrections'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ClassSettings>(getSettings());
    const [album, setAlbum] = useState<AlbumImage[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const { theme } = useTheme();

    // Tracker Modal
    const [isTrackerOpen, setIsTrackerOpen] = useState(false);
    // Mobile Menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 
     // Feedback Form
     const [fbName, setFbName] = useState('');
     const [fbMessage, setFbMessage] = useState('');    // Application Tracker
    const [studentId, setStudentId] = useState('');
    const [section, setSection] = useState('');
    const [school, setSchool] = useState('');
    const [college, setCollege] = useState('');
    const [program, setProgram] = useState('');
    const [major, setMajor] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<RegistrationApplication[] | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

    useEffect(() => {
        setSettings(getSettings());
        setAlbum(getAlbum());
        setAchievements(getAchievements());
    }, []);

    // Real-time tracking: Re-search if applications updated
    useEffect(() => {
        const handleApplicationsUpdated = async () => {
            if (results && results.length > 0 && studentId && section) {
                // Re-fetch results from Firebase for real-time updates
                try {
                    const found = await findApplicationsRealtime({
                        studentId: studentId.trim(),
                        section: section.trim(),
                        school: school.trim() || undefined,
                        college: college.trim() || undefined,
                        program: program.trim() || undefined,
                        major: major.trim() || undefined
                    });
                    setResults(found);
                    setLastRefresh(Date.now());
                } catch (error) {
                    console.error('Error refreshing application status:', error);
                }
            }
        };
        
        window.addEventListener('applicationsUpdated', handleApplicationsUpdated);
        
        // Periodic refresh every 5 seconds - fetch directly from Firebase
        const intervalId = setInterval(async () => {
            if (results && results.length > 0 && studentId && section) {
                try {
                    const found = await findApplicationsRealtime({
                        studentId: studentId.trim(),
                        section: section.trim(),
                        school: school.trim() || undefined,
                        college: college.trim() || undefined,
                        program: program.trim() || undefined,
                        major: major.trim() || undefined
                    });
                    // Only update if status changed
                    if (found.length > 0 && found[0].status !== results[0].status) {
                        setResults(found);
                        setLastRefresh(Date.now());
                    }
                } catch (error) {
                    console.error('Error in periodic refresh:', error);
                }
            }
        }, 5000);
        
        return () => {
            window.removeEventListener('applicationsUpdated', handleApplicationsUpdated);
            clearInterval(intervalId);
        };
    }, [results, studentId, section, school, college, program, major]);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleFeedback = (e: React.FormEvent) => {
        e.preventDefault();
        if(!fbMessage) return;

        const fb: Feedback = {
            id: Date.now().toString(),
            name: fbName || 'Anonymous',
            message: fbMessage,
            date: Date.now(),
            isRead: false
        };
        saveFeedback(fb);
        alert('Feedback sent! Thank you.');
        setFbName('');
        setFbMessage('');
    };

    const handleTrackSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError(null);
        setSearching(true);
        try {
            if (!studentId.trim() || !section.trim()) {
                setSearchError('Please enter both Student ID and Section.');
                setResults(null);
                return;
            }
            // Use realtime function that fetches directly from Firebase
            const found = await findApplicationsRealtime({
                studentId: studentId.trim(),
                section: section.trim(),
                school: school.trim() || undefined,
                college: college.trim() || undefined,
                program: program.trim() || undefined,
                major: major.trim() || undefined
            });
            setResults(found);
            setLastRefresh(Date.now());
            if (found.length === 0) setSearchError('No matching application found.');
        } catch (error) {
            console.error('Search error:', error);
            setSearchError('Failed to fetch application status. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900'} font-sans`}>
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-3">
                            <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-full border-2 border-amber-500" />
                            <span className="font-display font-bold text-xl text-stone-800 dark:text-amber-50 hidden sm:block">{settings.className}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Desktop Nav */}
                            <button onClick={() => scrollToSection('album')} className="text-sm font-medium hover:text-amber-600 transition-colors hidden lg:block">Gallery</button>
                            <button onClick={() => scrollToSection('achievements')} className="text-sm font-medium hover:text-amber-600 transition-colors hidden lg:block">Achievements</button>
                            <button onClick={() => scrollToSection('contact')} className="text-sm font-medium hover:text-amber-600 transition-colors hidden lg:block">Contact</button>
                            <button 
                                onClick={() => setIsTrackerOpen(true)}
                                className="text-sm font-bold px-4 py-2 rounded-full border border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors hidden md:flex items-center gap-2"
                            >
                                <Search size={14} /> Track Application
                            </button>
                            <button 
                                onClick={() => navigate('/login')} 
                                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-amber-900/20 hidden sm:flex items-center"
                            >
                                Student Portal <ArrowRight size={16} className="ml-2" />
                            </button>
                            {/* Mobile Menu Button */}
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Dropdown */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden border-t border-stone-200 dark:border-stone-800 py-4 space-y-2">
                            <button onClick={() => { scrollToSection('album'); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-3">
                                <ImageIcon size={18} className="text-amber-600" /> Gallery
                            </button>
                            <button onClick={() => { scrollToSection('achievements'); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-3">
                                <Award size={18} className="text-amber-600" /> Achievements
                            </button>
                            <button onClick={() => { scrollToSection('contact'); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-3">
                                <Mail size={18} className="text-amber-600" /> Contact
                            </button>
                            <div className="border-t border-stone-200 dark:border-stone-700 my-2"></div>
                            <button 
                                onClick={() => { setIsTrackerOpen(true); setIsMobileMenuOpen(false); }}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-3"
                            >
                                <Search size={18} /> Track Application
                            </button>
                            <button 
                                onClick={() => navigate('/login')} 
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                Student Portal <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-stone-100 dark:from-stone-900 dark:to-stone-950 -z-10"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="font-display text-5xl md:text-7xl font-extrabold text-stone-900 dark:text-white mb-6 animate-in">
                        Mabuhay! <span className="text-amber-600">Welcome.</span>
                    </h1>
                    <p className="text-xl text-stone-600 dark:text-stone-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Official website of <span className="font-bold text-stone-800 dark:text-amber-100">{settings.className}</span>. 
                        Tracking our journey, achievements, and memories for the academic year {settings.academicYear}.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => scrollToSection('album')} className="bg-stone-800 dark:bg-stone-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-stone-900 dark:hover:bg-stone-600 transition-all flex items-center shadow-xl">
                            <ImageIcon size={18} className="mr-2" /> View Class Album
                        </button>
                    </div>


                </div>
            </section>

            {/* Achievements Section */}
            <section id="achievements" className="py-20 bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="font-display text-3xl font-bold text-stone-800 dark:text-white mb-4 flex items-center justify-center">
                            <Award className="mr-3 text-amber-500 w-8 h-8" /> Hall of Fame
                        </h2>
                        <p className="text-stone-500 dark:text-stone-400">Celebrating our class victories and milestones.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {achievements.map(ach => (
                            <div key={ach.id} className="bg-stone-50 dark:bg-stone-800 rounded-2xl p-8 text-center hover:shadow-xl transition-all border border-stone-100 dark:border-stone-700 group">
                                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{ach.icon}</div>
                                <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">{ach.title}</h3>
                                <p className="text-stone-600 dark:text-stone-400 text-sm mb-4">{ach.description}</p>
                                <span className="inline-block px-3 py-1 bg-stone-200 dark:bg-stone-700 rounded-full text-xs font-semibold text-stone-600 dark:text-stone-300">
                                    {ach.date}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Album Section */}
            <section id="album" className="py-20 bg-stone-50 dark:bg-stone-950">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="font-display text-3xl font-bold text-stone-800 dark:text-white mb-4 flex items-center justify-center">
                            <ImageIcon className="mr-3 text-amber-500 w-8 h-8" /> Class Gallery
                        </h2>
                        <p className="text-stone-500 dark:text-stone-400">Snapshots of our memorable moments.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {album.map(img => (
                            <div key={img.id} className="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer h-64">
                                <img src={img.url} alt={img.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                    <p className="text-white font-bold text-lg">{img.caption}</p>
                                    <p className="text-stone-300 text-sm">{new Date(img.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </section>

            {/* Contact & Feedback */}
            <section id="contact" className="py-20 bg-stone-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <h2 className="font-display text-3xl font-bold mb-6">Get in Touch</h2>
                            <p className="text-stone-400 mb-8">Have questions, suggestions, or just want to say hi? Reach out to our class officers.</p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-amber-500">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold">Email Us</p>
                                        <p className="text-stone-400 text-sm">officers@mandirigmangfilipino.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-amber-500">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold">Location</p>
                                        <p className="text-stone-400 text-sm">Room 301, College of Education</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-stone-800 p-8 rounded-2xl shadow-xl border border-stone-700">
                            <h3 className="text-xl font-bold mb-4 flex items-center">
                                <MessageSquare className="mr-2 text-amber-500" /> Send Feedback
                            </h3>
                            <form onSubmit={handleFeedback} className="space-y-4">
                                <input type="text" placeholder="Your Name (Optional)" className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none" value={fbName} onChange={e => setFbName(e.target.value)} />
                                <textarea rows={4} placeholder="Your message..." className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none" value={fbMessage} onChange={e => setFbMessage(e.target.value)}></textarea>
                                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors">
                                    Submit Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <Modal isOpen={isTrackerOpen} onClose={() => setIsTrackerOpen(false)} title="Track Your Application">
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mb-4 sm:mb-6">Enter your details to view your application and its progress.</p>
                <form onSubmit={handleTrackSearch} className="space-y-3 sm:space-y-4">
                    {/* Required Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Student ID *" className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                        </div>
                        <div className="relative">
                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input value={section} onChange={e => setSection(e.target.value)} placeholder="Section *" className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                        </div>
                    </div>
                    
                    {/* Optional Fields */}
                    <details className="group">
                        <summary className="cursor-pointer text-xs sm:text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 transition-colors flex items-center gap-2">
                            <span>More filters (optional)</span>
                            <ArrowRight size={14} className="group-open:rotate-90 transition-transform" />
                        </summary>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                            <div className="relative">
                                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input value={school} onChange={e => setSchool(e.target.value)} placeholder="School" className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input value={college} onChange={e => setCollege(e.target.value)} placeholder="College" className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <BookOpen size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input value={program} onChange={e => setProgram(e.target.value)} placeholder="Program" className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3.5 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input value={major} onChange={e => setMajor(e.target.value)} placeholder="Major" className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3.5 text-stone-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                            </div>
                        </div>
                    </details>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
                        <button type="submit" disabled={searching} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-white px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-amber-500/25 flex items-center justify-center gap-2 text-sm sm:text-base">
                            <Search size={16} />
                            {searching ? 'Searching...' : 'Check Application'}
                        </button>
                        {searchError && <span className="text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-1"><XCircle size={14} /> {searchError}</span>}
                    </div>
                </form>

                {/* Results */}
                {results && (
                    <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                        {/* Real-time indicator */}
                        {results.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xs">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    Real-time tracking active
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                                        Last: {new Date(lastRefresh).toLocaleTimeString()}
                                    </span>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const found = await findApplicationsRealtime({
                                                    studentId: studentId.trim(),
                                                    section: section.trim(),
                                                    school: school.trim() || undefined,
                                                    college: college.trim() || undefined,
                                                    program: program.trim() || undefined,
                                                    major: major.trim() || undefined
                                                });
                                                setResults(found);
                                                setLastRefresh(Date.now());
                                            } catch (error) {
                                                console.error('Refresh error:', error);
                                            }
                                        }}
                                        className="text-xs text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center gap-1 font-medium"
                                    >
                                        <RefreshCcw size={12} />
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {results.length > 0 && results.map(app => {
                            const prog = applicationProgress(app);
                            const pct = ((prog.stepIndex + 1) / prog.steps.length) * 100;
                            const statusConfig = {
                                pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Clock, gradient: 'from-amber-500 to-orange-500' },
                                verifying: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Search, gradient: 'from-blue-500 to-cyan-500' },
                                approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2, gradient: 'from-green-500 to-emerald-500' },
                                rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle, gradient: 'from-red-500 to-rose-500' }
                            };
                            const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            return (
                                <div key={app.id} className="relative overflow-hidden border border-stone-200 dark:border-stone-700 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-900 shadow-sm hover:shadow-lg transition-all duration-300">
                                    {/* Status Bar */}
                                    <div className={`h-1 sm:h-1.5 bg-gradient-to-r ${status.gradient}`}></div>
                                    
                                    {/* Header with Avatar - Mobile Optimized */}
                                    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-5 border-b border-stone-100 dark:border-stone-700">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${status.gradient} p-0.5`}>
                                                <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 overflow-hidden relative">
                                                    <div className="absolute inset-0 flex items-center justify-center text-sm sm:text-xl font-bold text-amber-600">
                                                        {app.fullName.substring(0,2).toUpperCase()}
                                                    </div>
                                                    {app.avatar && (
                                                        <img 
                                                            src={getImageUrl(app.avatar)} 
                                                            alt={app.fullName} 
                                                            className="absolute inset-0 w-full h-full object-cover z-10" 
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full ${status.bg} flex items-center justify-center border-2 border-white dark:border-stone-800`}>
                                                <StatusIcon size={10} className={`sm:hidden ${status.text}`} />
                                                <StatusIcon size={12} className={`hidden sm:block ${status.text}`} />
                                            </div>
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white leading-tight">{app.fullName}</h3>
                                                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">@{app.username}</p>
                                                </div>
                                                <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold ${status.bg} ${status.text} self-start`}>
                                                    <StatusIcon size={12} className="sm:hidden" />
                                                    <StatusIcon size={14} className="hidden sm:block" />
                                                    {app.status.toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                                <span className="px-1.5 sm:px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] sm:text-xs font-bold">
                                                    {app.section}
                                                </span>
                                                <span className="text-[10px] sm:text-xs text-stone-500 font-mono">{app.studentId}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Progress Section */}
                                    <div className="p-3 sm:p-5 bg-stone-50/50 dark:bg-stone-900/50">
                                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                                            <span className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300">Application Progress</span>
                                            <span className={`text-xs sm:text-sm font-bold ${status.text}`}>{Math.round(pct)}%</span>
                                        </div>
                                        <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2 sm:h-3 overflow-hidden">
                                            <div className={`h-full bg-gradient-to-r ${status.gradient} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                        
                                        {/* Steps */}
                                        <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                                            {prog.steps.slice(0, 3).map((s, i) => (
                                                <div key={s.key} className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                                                        i < prog.stepIndex 
                                                            ? 'bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-green-900' 
                                                            : i === prog.stepIndex 
                                                                ? `bg-gradient-to-br ${status.gradient} text-white ring-2 sm:ring-4 ring-offset-1 sm:ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-900 ring-amber-200 dark:ring-amber-800 shadow-lg` 
                                                                : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                                                    }`}>
                                                        {i < prog.stepIndex ? <CheckCircle2 size={14} className="sm:hidden" /> : null}
                                                        {i < prog.stepIndex ? <CheckCircle2 size={18} className="hidden sm:block" /> : null}
                                                        {i >= prog.stepIndex ? i + 1 : null}
                                                    </div>
                                                    <span className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 text-center leading-tight font-medium ${
                                                        i <= prog.stepIndex ? 'text-stone-800 dark:text-white' : 'text-stone-400'
                                                    }`}>{s.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Detailed Info - Mobile Optimized */}
                                    <div className="p-3 sm:p-5 space-y-2 sm:space-y-3 border-t border-stone-100 dark:border-stone-700">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                                                <Mail size={12} className="text-stone-400 flex-shrink-0" />
                                                <span className="truncate">{app.universityEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                                                <Phone size={12} className="text-stone-400 flex-shrink-0" />
                                                <span>{app.contactNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                                                <GraduationCap size={12} className="text-stone-400 flex-shrink-0" />
                                                <span className="truncate">{app.program}</span>
                                            </div>
                                            {app.major && (
                                                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                                                    <BookOpen size={12} className="text-stone-400 flex-shrink-0" />
                                                    <span className="truncate">{app.major}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                                                <Building2 size={12} className="text-stone-400 flex-shrink-0" />
                                                <span className="truncate">{app.school}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                                                <MapPinned size={12} className="text-stone-400 flex-shrink-0" />
                                                <span className="truncate">{app.city}, {app.province}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Timeline */}
                                        <div className="pt-2 sm:pt-3 border-t border-stone-100 dark:border-stone-700">
                                            <p className="text-[10px] sm:text-xs font-medium text-stone-500 mb-1.5 sm:mb-2 flex items-center gap-1">
                                                <Calendar size={12} /> Timeline
                                            </p>
                                            <div className="space-y-1 text-[10px] sm:text-xs text-stone-600 dark:text-stone-400">
                                                <p className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                                                    Submitted: {new Date(app.submittedAt).toLocaleString()}
                                                </p>
                                                {app.reviewedAt && (
                                                    <p className="flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${app.status === 'approved' ? 'bg-green-500' : app.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                                        Reviewed: {new Date(app.reviewedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Approved Message */}
                                        {app.status === 'approved' && (
                                            <div className="mt-2 sm:mt-3 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                                <div className="flex items-start gap-2 sm:gap-3">
                                                    <Sparkles size={16} className="text-green-600 flex-shrink-0 mt-0.5 sm:hidden" />
                                                    <Sparkles size={20} className="text-green-600 flex-shrink-0 mt-0.5 hidden sm:block" />
                                                    <div>
                                                        <p className="font-bold text-green-700 dark:text-green-400 text-sm sm:text-base">Application Approved!</p>
                                                        <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1">
                                                            Your account has been created. Login with <strong>@{app.username}</strong> and ID <strong>{app.studentId}</strong> as password.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Fields Needing Correction */}
                                        {app.fieldsNeedingCorrection && app.fieldsNeedingCorrection.length > 0 && app.status !== 'approved' && app.status !== 'rejected' && (
                                            <FieldCorrectionSection 
                                                app={app} 
                                                onUpdate={async () => {
                                                    const found = await findApplicationsRealtime({
                                                        studentId: studentId.trim(),
                                                        section: section.trim(),
                                                        school: school.trim() || undefined,
                                                        college: college.trim() || undefined,
                                                        program: program.trim() || undefined,
                                                        major: major.trim() || undefined
                                                    });
                                                    setResults(found);
                                                    setLastRefresh(Date.now());
                                                }}
                                            />
                                        )}
                                        
                                        {/* Rejection Reason (Final) */}
                                        {app.status === 'rejected' && (
                                            <div className="mt-2 sm:mt-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                                <div className="flex items-start gap-2 sm:gap-3">
                                                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5 sm:hidden" />
                                                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5 hidden sm:block" />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-red-700 dark:text-red-400 text-sm sm:text-base">Application Rejected</p>
                                                        {app.rejectionReason && (
                                                            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">{app.rejectionReason}</p>
                                                        )}
                                                        
                                                        {/* Show rejected fields with issues */}
                                                        {app.fieldVerifications && Object.keys(app.fieldVerifications).length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                <p className="text-xs font-bold text-red-700 dark:text-red-400">Fields that need correction:</p>
                                                                {Object.entries(app.fieldVerifications)
                                                                    .filter(([_, v]) => v && !v.verified && v.issue)
                                                                    .map(([field, verification]) => (
                                                                        <div key={field} className="flex items-start gap-2 p-2 bg-white dark:bg-stone-800 rounded-lg border border-red-200 dark:border-red-700">
                                                                            <XCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{FIELD_LABELS[field] || field}</p>
                                                                                <p className="text-xs text-red-600 dark:text-red-400">{verification?.issue}</p>
                                                                                <p className="text-xs text-stone-500 mt-0.5">Current: {(app as any)[field] || 'Not provided'}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                        
                                                        {/* Retry button for rejected applications */}
                                                        {(() => {
                                                            const maxAttempts = settings.maxApplicationAttempts || 5;
                                                            const currentAttempt = app.attemptNumber || 1;
                                                            const canRetry = currentAttempt < maxAttempts;
                                                            
                                                            // Get fields that have issues
                                                            const fieldsWithIssues = app.fieldVerifications 
                                                                ? Object.entries(app.fieldVerifications)
                                                                    .filter(([_, v]) => v && !v.verified && v.issue)
                                                                    .map(([field, v]) => ({ field, issue: v!.issue! }))
                                                                : [];
                                                            
                                                            return canRetry ? (
                                                                <div className="mt-3 p-3 bg-white dark:bg-stone-800 rounded-lg border border-red-200 dark:border-red-700">
                                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                                        <div>
                                                                            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                                                                                {fieldsWithIssues.length > 0 
                                                                                    ? `Correct ${fieldsWithIssues.length} field(s) to resubmit`
                                                                                    : 'You can resubmit your application'
                                                                                }
                                                                            </p>
                                                                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                                                                Attempt {currentAttempt} of {maxAttempts}
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                // Navigate to correction form with only the fields that need fixing
                                                                                navigate('/register', { 
                                                                                    state: { 
                                                                                        retryApplication: app,
                                                                                        attemptNumber: currentAttempt + 1,
                                                                                        fieldsToCorrect: fieldsWithIssues,
                                                                                        correctionMode: fieldsWithIssues.length > 0
                                                                                    } 
                                                                                });
                                                                            }}
                                                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                                                                        >
                                                                            <RotateCcw size={14} />
                                                                            {fieldsWithIssues.length > 0 ? 'Correct & Retry' : 'Retry Application'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                                                                    Maximum retry attempts ({maxAttempts}) reached. Please contact the administrator for assistance.
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {results.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                    <Search size={32} className="text-stone-400" />
                                </div>
                                <p className="text-lg font-medium text-stone-600 dark:text-stone-400">No matching application found</p>
                                <p className="text-sm text-stone-500 mt-1">Please verify your Student ID and Section are correct.</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Footer */}
            <footer className="bg-stone-950 py-8 text-center border-t border-stone-900">
                <p className="text-stone-500 text-sm">
                    © {new Date().getFullYear()} {settings.className}. All rights reserved. <br />
                    Powered by ClassSync System.
                </p>
            </footer>
        </div>
    );
};