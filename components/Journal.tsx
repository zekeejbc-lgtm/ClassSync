import React, { useState, useEffect } from 'react';
import { User, JournalEntry } from '../types';
import { getJournalEntries, saveJournalEntry, deleteJournalEntry, searchJournalEntries } from '../services/dataService';
import { 
    Plus, Search, Calendar, Edit2, Trash2, ChevronLeft, ChevronRight, 
    BookOpen, Lightbulb, Tag, X, Save, Smile, Meh, Frown, Heart, AlertCircle
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

interface JournalProps {
    user: User;
}

type MoodType = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

const moodConfig: Record<MoodType, { icon: (size: number) => React.ReactNode; label: string; color: string; bgColor: string }> = {
    great: { icon: (size) => <Heart size={size} />, label: 'Great', color: 'text-pink-500', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
    good: { icon: (size) => <Smile size={size} />, label: 'Good', color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    neutral: { icon: (size) => <Meh size={size} />, label: 'Neutral', color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    bad: { icon: (size) => <Frown size={size} />, label: 'Bad', color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    terrible: { icon: (size) => <AlertCircle size={size} />, label: 'Terrible', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

export const JournalModule: React.FC<JournalProps> = ({ user }) => {
    const { showToast } = useToast();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
    const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
    
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formLessons, setFormLessons] = useState('');
    const [formMood, setFormMood] = useState<MoodType>('neutral');
    const [formTags, setFormTags] = useState<string[]>([]);
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [tagInput, setTagInput] = useState('');
    
    // Selected entry for viewing
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    useEffect(() => {
        refreshEntries();
    }, [user.id]);

    const refreshEntries = () => {
        if (searchQuery.trim()) {
            setEntries(searchJournalEntries(user.id, searchQuery));
        } else {
            setEntries(getJournalEntries(user.id));
        }
    };

    useEffect(() => {
        refreshEntries();
    }, [searchQuery]);

    const openModal = (entry?: JournalEntry) => {
        if (entry) {
            setEditingEntry(entry);
            setFormTitle(entry.title);
            setFormContent(entry.content);
            setFormLessons(entry.lessons);
            setFormMood(entry.mood || 'neutral');
            setFormTags(entry.tags || []);
            setFormDate(entry.date);
        } else {
            setEditingEntry(null);
            setFormTitle('');
            setFormContent('');
            setFormLessons('');
            setFormMood('neutral');
            setFormTags([]);
            setFormDate(new Date().toISOString().split('T')[0]);
        }
        setTagInput('');
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formContent.trim()) {
            showToast('Please fill in title and reflection content', 'error');
            return;
        }

        const entry: JournalEntry = {
            id: editingEntry?.id || Date.now().toString(),
            userId: user.id,
            date: formDate,
            title: formTitle,
            content: formContent,
            lessons: formLessons,
            mood: formMood,
            tags: formTags,
            createdAt: editingEntry?.createdAt || Date.now(),
            updatedAt: Date.now()
        };

        saveJournalEntry(entry);
        showToast(editingEntry ? 'Entry updated!' : 'Entry created!', 'success');
        setIsModalOpen(false);
        refreshEntries();
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this journal entry?')) {
            deleteJournalEntry(id);
            showToast('Entry deleted', 'info');
            setSelectedEntry(null);
            refreshEntries();
        }
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !formTags.includes(tag)) {
            setFormTags([...formTags, tag]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormTags(formTags.filter(t => t !== tag));
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getRelativeDate = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (dateStr === today) return 'Today';
        if (dateStr === yesterday) return 'Yesterday';
        return formatDate(dateStr);
    };

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: (Date | null)[] = [];
        
        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        
        // Add all days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const hasEntryOnDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return entries.some(e => e.date === dateStr);
    };

    const getEntryForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return entries.find(e => e.date === dateStr);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            return newDate;
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800 dark:text-white flex items-center gap-2">
                        <BookOpen className="text-amber-600" />
                        Daily Reflection Journal
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
                        Record your lessons learned and insights each day
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-amber-600/20"
                >
                    <Plus size={20} />
                    New Entry
                </button>
            </div>

            {/* Search and View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by date, keyword, or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'timeline'
                                ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                    >
                        Timeline
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                            viewMode === 'calendar'
                                ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                    >
                        <Calendar size={16} />
                        Calendar
                    </button>
                </div>
            </div>

            {/* Timeline View */}
            {viewMode === 'timeline' && (
                <div className="space-y-4">
                    {entries.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                            <BookOpen size={48} className="mx-auto text-stone-300 dark:text-stone-600 mb-4" />
                            <h3 className="text-lg font-medium text-stone-600 dark:text-stone-400">No journal entries yet</h3>
                            <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">
                                Start your first reflection today!
                            </p>
                            <button
                                onClick={() => openModal()}
                                className="mt-4 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
                            >
                                <Plus size={18} />
                                Create your first entry
                            </button>
                        </div>
                    ) : (
                        entries.map((entry, idx) => (
                            <div
                                key={entry.id}
                                className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-5 hover:shadow-lg transition-all cursor-pointer group"
                                onClick={() => setSelectedEntry(entry)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                                                {getRelativeDate(entry.date)}
                                            </span>
                                            {entry.mood && (
                                                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${moodConfig[entry.mood].color} ${moodConfig[entry.mood].bgColor}`}>
                                                    {moodConfig[entry.mood].icon(16)}
                                                    {moodConfig[entry.mood].label}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-2 truncate">
                                            {entry.title}
                                        </h3>
                                        <p className="text-stone-600 dark:text-stone-400 text-sm line-clamp-2">
                                            {entry.content}
                                        </p>
                                        {entry.lessons && (
                                            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <Lightbulb size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-amber-800 dark:text-amber-200 line-clamp-2">
                                                    {entry.lessons}
                                                </p>
                                            </div>
                                        )}
                                        {entry.tags && entry.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {entry.tags.map(tag => (
                                                    <span key={tag} className="text-xs text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openModal(entry); }}
                                            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && (
                <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-lg font-semibold text-stone-800 dark:text-white">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-stone-500 dark:text-stone-400 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth(currentMonth).map((date, idx) => {
                            if (!date) {
                                return <div key={idx} className="aspect-square" />;
                            }
                            
                            const entry = getEntryForDate(date);
                            const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                            
                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (entry) {
                                            setSelectedEntry(entry);
                                        } else {
                                            setFormDate(date.toISOString().split('T')[0]);
                                            openModal();
                                        }
                                    }}
                                    className={`aspect-square p-1 rounded-lg cursor-pointer transition-all relative ${
                                        isToday
                                            ? 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-500'
                                            : 'hover:bg-stone-100 dark:hover:bg-stone-700'
                                    } ${entry ? 'border-2 border-amber-400 dark:border-amber-600' : ''}`}
                                >
                                    <div className={`text-sm font-medium ${isToday ? 'text-amber-600 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}`}>
                                        {date.getDate()}
                                    </div>
                                    {entry && entry.mood && (
                                        <div className={`absolute bottom-1 right-1 ${moodConfig[entry.mood].color}`}>
                                            {moodConfig[entry.mood].icon(12)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Entry Detail Modal */}
            {selectedEntry && (
                <Modal isOpen={true} onClose={() => setSelectedEntry(null)} title="Journal Entry">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                                {formatDate(selectedEntry.date)}
                            </span>
                            {selectedEntry.mood && (
                                <span className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${moodConfig[selectedEntry.mood].color} ${moodConfig[selectedEntry.mood].bgColor}`}>
                                    {moodConfig[selectedEntry.mood].icon(20)}
                                    {moodConfig[selectedEntry.mood].label}
                                </span>
                            )}
                        </div>
                        
                        <h2 className="text-2xl font-bold text-stone-800 dark:text-white">
                            {selectedEntry.title}
                        </h2>
                        
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-stone-600 dark:text-stone-300 whitespace-pre-wrap">
                                {selectedEntry.content}
                            </p>
                        </div>
                        
                        {selectedEntry.lessons && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb size={20} className="text-amber-600 dark:text-amber-400" />
                                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Lessons Learned</h4>
                                </div>
                                <p className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                                    {selectedEntry.lessons}
                                </p>
                            </div>
                        )}
                        
                        {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedEntry.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-sm text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-3 py-1 rounded-full">
                                        <Tag size={12} />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        
                        <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                            <button
                                onClick={() => { setSelectedEntry(null); openModal(selectedEntry); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg transition-colors"
                            >
                                <Edit2 size={18} />
                                Edit Entry
                            </button>
                            <button
                                onClick={() => handleDelete(selectedEntry.id)}
                                className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? 'Edit Entry' : 'New Reflection'}>
                <form onSubmit={handleSave} className="space-y-5">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                            Date
                        </label>
                        <input
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="What's the highlight of your day?"
                            className="w-full px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Mood */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                            How are you feeling?
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(moodConfig) as MoodType[]).map(mood => (
                                <button
                                    key={mood}
                                    type="button"
                                    onClick={() => setFormMood(mood)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                        formMood === mood
                                            ? `${moodConfig[mood].color} ${moodConfig[mood].bgColor} border-current`
                                            : 'border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-500'
                                    }`}
                                >
                                    {moodConfig[mood].icon(20)}
                                    <span className="text-sm font-medium">{moodConfig[mood].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                            Reflection <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formContent}
                            onChange={(e) => setFormContent(e.target.value)}
                            placeholder="What happened today? How did it make you feel?"
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            required
                        />
                    </div>

                    {/* Lessons */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-2">
                            <Lightbulb size={16} className="text-amber-500" />
                            Lessons Learned
                        </label>
                        <textarea
                            value={formLessons}
                            onChange={(e) => setFormLessons(e.target.value)}
                            placeholder="What insights or lessons did you gain today?"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-stone-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                            Tags
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                placeholder="Add a tag"
                                className="flex-1 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-2 bg-stone-100 dark:bg-stone-600 text-stone-600 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-500 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        {formTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formTags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-sm text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 px-3 py-1 rounded-full">
                                        #{tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="text-stone-400 hover:text-red-500 ml-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg transition-colors"
                        >
                            <Save size={18} />
                            {editingEntry ? 'Update Entry' : 'Save Entry'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default JournalModule;
