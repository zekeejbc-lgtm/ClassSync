
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, getAlbum, getAchievements, saveFeedback } from '../services/dataService';
import { ClassSettings, AlbumImage, Achievement, Feedback } from '../types';
import { MapPin, Mail, Phone, ArrowRight, MessageSquare, Award, Image as ImageIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ClassSettings>(getSettings());
    const [album, setAlbum] = useState<AlbumImage[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const { theme } = useTheme();

    // Feedback Form
    const [fbName, setFbName] = useState('');
    const [fbMessage, setFbMessage] = useState('');

    useEffect(() => {
        setSettings(getSettings());
        setAlbum(getAlbum());
        setAchievements(getAchievements());
    }, []);

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
                        <div className="flex items-center space-x-6">
                            <button onClick={() => scrollToSection('album')} className="text-sm font-medium hover:text-amber-600 transition-colors hidden md:block">Gallery</button>
                            <button onClick={() => scrollToSection('achievements')} className="text-sm font-medium hover:text-amber-600 transition-colors hidden md:block">Achievements</button>
                            <button onClick={() => scrollToSection('contact')} className="text-sm font-medium hover:text-amber-600 transition-colors hidden md:block">Contact</button>
                            <button 
                                onClick={() => navigate('/login')} 
                                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-amber-900/20 flex items-center"
                            >
                                Student Portal <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    </div>
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