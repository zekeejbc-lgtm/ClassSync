import React, { useState, useEffect } from 'react';
import { 
    School, Department, College, Program, Major, Track, Strand, YearLevel, Section,
    User, UserRole, UserPosition, DepartmentType, SeniorHighTrack
} from '../types';
import {
    getSchools, addSchool, updateSchool, deleteSchool,
    getDepartments, getDepartmentsBySchool, addDepartment, updateDepartment, deleteDepartment,
    getColleges, getCollegesByDepartment, addCollege, updateCollege, deleteCollege,
    getPrograms, getProgramsByCollege, addProgram, updateProgram, deleteProgram,
    getMajors, getMajorsByProgram, addMajor, updateMajor, deleteMajor,
    getTracks, getTracksByDepartment, addTrack, updateTrack, deleteTrack,
    getStrands, getStrandsByTrack, addStrand, updateStrand, deleteStrand,
    getYearLevels, getYearLevelsByParent, addYearLevel, updateYearLevel, deleteYearLevel,
    getSections, getSectionsByYearLevel, addSection, updateSection, deleteSection,
    getUsersBySection, logAccess, updateUser, getUsers
} from '../services/dataService';
import { PERMISSIONS } from '../constants';
import { FileUploader } from './ui/FileUploader';
import { ModalPortal } from './ui/Modal';
import { 
    Building2, GraduationCap, BookOpen, Users, Plus, Edit3, Trash2, 
    ChevronRight, ChevronLeft, MapPin, Phone, Globe, ExternalLink,
    School as SchoolIcon, Layers, FolderTree, User as UserIcon,
    Save, X, Search, LayoutGrid, List, Eye, RefreshCcw, Home,
    Shield, UserX, UserCheck, Key, Mail, Image
} from 'lucide-react';
import { useToast } from './ui/Toast';
import { CustomSelect } from './ui/CustomSelect';

// Helper function to convert Google Drive URLs to embeddable format
const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    
    // Extract file ID from various Google Drive URL formats
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
        // Use lh3.googleusercontent.com which is the most reliable for embedding
        return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }
    
    return url;
};

// Helper function to convert various Google Maps URL formats to embeddable format
const getGoogleMapsEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    
    // If it's already an embed URL, return as-is
    if (url.includes('/maps/embed')) return url;
    
    // Handle shortened goo.gl and maps.app.goo.gl URLs - these can't be embedded directly
    // We'll extract place info from other URL formats
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        // For shortened URLs, we can't embed them directly
        // Return null and show a link instead
        return null;
    }
    
    // Handle standard Google Maps URLs with place info
    // https://www.google.com/maps/place/...
    if (url.includes('google.com/maps/place/')) {
        const placeMatch = url.match(/place\/([^\/\?]+)/);
        if (placeMatch) {
            const placeName = placeMatch[1];
            return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(placeName.replace(/\+/g, ' '))}`;
        }
    }
    
    // Handle maps with coordinates
    // https://www.google.com/maps/@lat,lng,zoom
    const coordMatch = url.match(/@([-\d.]+),([-\d.]+)/);
    if (coordMatch) {
        const lat = coordMatch[1];
        const lng = coordMatch[2];
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1`;
    }
    
    return null;
};

// ==========================================
// SCHOOL CARD WITH DYNAMIC BORDER COLOR
// ==========================================

interface SchoolCardProps {
    school: School;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
    getLevelIcon: () => React.ReactNode;
}

const SchoolCard: React.FC<SchoolCardProps> = ({ school, onClick, onEdit, onDelete, canEdit, getLevelIcon }) => {
    const [borderColor, setBorderColor] = useState<string>('');
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    
    useEffect(() => {
        if (school.logoUrl) {
            const img = document.createElement('img') as HTMLImageElement;
            img.crossOrigin = 'Anonymous';
            img.src = getImageUrl(school.logoUrl);
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    // Count color occurrences
                    const colorCounts: Record<string, number> = {};
                    
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];
                        
                        // Skip transparent and very light/white pixels
                        if (a < 128) continue;
                        if (r > 240 && g > 240 && b > 240) continue;
                        if (r < 15 && g < 15 && b < 15) continue;
                        
                        // Quantize to reduce unique colors
                        const qr = Math.round(r / 32) * 32;
                        const qg = Math.round(g / 32) * 32;
                        const qb = Math.round(b / 32) * 32;
                        
                        const colorKey = `${qr},${qg},${qb}`;
                        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
                    }
                    
                    // Find the most dominant color
                    let maxCount = 0;
                    let dominantColor = '';
                    
                    for (const [color, count] of Object.entries(colorCounts)) {
                        if (count > maxCount) {
                            maxCount = count;
                            dominantColor = color;
                        }
                    }
                    
                    if (dominantColor) {
                        const [r, g, b] = dominantColor.split(',').map(Number);
                        setBorderColor(`rgb(${r}, ${g}, ${b})`);
                    }
                    setIsImageLoaded(true);
                } catch (e) {
                    // CORS or other error - use default
                    setIsImageLoaded(true);
                }
            };
            
            img.onerror = () => {
                setIsImageLoaded(true);
            };
        }
    }, [school.logoUrl]);
    
    return (
        <div 
            className="bg-white dark:bg-stone-800 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
            style={{ 
                border: borderColor ? `2px solid ${borderColor}` : '1px solid rgb(231, 229, 228)',
                borderColor: borderColor || undefined
            }}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {school.logoUrl ? (
                        <div 
                            className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-700"
                            style={borderColor ? { boxShadow: `0 0 0 2px ${borderColor}20` } : {}}
                        >
                            <img 
                                src={getImageUrl(school.logoUrl)} 
                                alt={school.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    ) : (
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 flex-shrink-0">
                            {getLevelIcon()}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-stone-900 dark:text-white text-sm leading-tight line-clamp-2">{school.name}</h3>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-1.5 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                    <ChevronRight className="text-stone-400 group-hover:text-amber-500 transition-colors flex-shrink-0" size={18} />
                </div>
            </div>
            
            <div className="space-y-1 flex-1">
                {school.address && (
                    <p className="text-xs text-stone-500 flex items-center gap-1 line-clamp-2">
                        <MapPin size={12} className="flex-shrink-0" /> <span className="truncate">{school.address}</span>
                    </p>
                )}
                {school.contactNumber && (
                    <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                        <Phone size={12} className="flex-shrink-0" /> {school.contactNumber}
                    </p>
                )}
                {school.googleMapUrl && (
                    <a 
                        href={school.googleMapUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 truncate"
                        onClick={e => e.stopPropagation()}
                    >
                        <ExternalLink size={12} className="flex-shrink-0" /> <span className="truncate">View on Map</span>
                    </a>
                )}
            </div>
        </div>
    );
};

// ==========================================
// SCHOOL LIST ITEM COMPONENT
// ==========================================

interface SchoolListItemProps {
    school: School;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
}

const SchoolListItem: React.FC<SchoolListItemProps> = ({ school, onClick, onEdit, onDelete, canEdit }) => {
    return (
        <div 
            className="flex items-center gap-4 p-3 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
            onClick={onClick}
        >
            {school.logoUrl ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-700">
                    <img 
                        src={getImageUrl(school.logoUrl)} 
                        alt={school.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            ) : (
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 flex-shrink-0">
                    <Building2 size={20} />
                </div>
            )}
            
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-900 dark:text-white line-clamp-2 text-sm">{school.name}</h3>
                <p className="text-sm text-stone-500 flex items-center gap-1 mt-1 line-clamp-1">
                    <MapPin size={14} className="flex-shrink-0" /> <span className="truncate">{school.address || 'No address'}</span>
                </p>
            </div>
            
            {school.contactNumber && (
                <div className="hidden sm:flex items-center gap-1 text-stone-500">
                    <Phone size={14} /> {school.contactNumber}
                </div>
            )}
            
            <div className="flex items-center gap-2">
                {canEdit && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Edit3 size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
                <ChevronRight className="text-stone-400 group-hover:text-amber-500 transition-colors" />
            </div>
        </div>
    );
};

// ==========================================
// GENERIC LIST ITEM COMPONENT
// ==========================================

interface ListItemProps {
    item: any;
    level: NavigationLevel;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
}

const ListItem: React.FC<ListItemProps> = ({ item, level, onClick, onEdit, onDelete, canEdit }) => {
    const getIcon = () => {
        switch (level) {
            case 'departments': return <Building2 size={20} />;
            case 'colleges': return <GraduationCap size={20} />;
            case 'programs': return <BookOpen size={20} />;
            case 'tracks': return <Layers size={20} />;
            case 'strands': return <BookOpen size={20} />;
            case 'majors': return <GraduationCap size={20} />;
            case 'yearLevels': return <Layers size={20} />;
            case 'sections': return <Users size={20} />;
            case 'members': return <UserIcon size={20} />;
            default: return <Building2 size={20} />;
        }
    };

    return (
        <div 
            className="flex items-center gap-4 p-3 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
            onClick={onClick}
        >
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 flex-shrink-0">
                {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-900 dark:text-white line-clamp-2 text-sm">{item.name}</h3>
                {item.abbreviation && (
                    <p className="text-sm text-stone-500 truncate">{item.abbreviation}</p>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {canEdit && level !== 'members' && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Edit3 size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
                <ChevronRight className="text-stone-400 group-hover:text-amber-500 transition-colors" />
            </div>
        </div>
    );
};

// ==========================================
// SCHOOL MANAGEMENT COMPONENT
// ==========================================

interface SchoolManagementProps {
    user: User;
}

type NavigationLevel = 'schools' | 'departments' | 'colleges' | 'tracks' | 'programs' | 'strands' | 'majors' | 'yearLevels' | 'sections' | 'members';

interface NavigationState {
    level: NavigationLevel;
    schoolId?: string;
    departmentId?: string;
    collegeId?: string;
    trackId?: string;
    programId?: string;
    strandId?: string;
    majorId?: string;
    yearLevelId?: string;
    sectionId?: string;
}

export const SchoolManagement: React.FC<SchoolManagementProps> = ({ user }) => {
    const { showToast } = useToast();
    
    // Navigation state
    const [navState, setNavState] = useState<NavigationState>({ level: 'schools' });
    const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; level: NavigationLevel; state: NavigationState }[]>([]);
    
    // Data
    const [schools, setSchools] = useState<School[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [strands, setStrands] = useState<Strand[]>([]);
    const [majors, setMajors] = useState<Major[]>([]);
    const [yearLevels, setYearLevels] = useState<YearLevel[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [members, setMembers] = useState<User[]>([]);
    
    // UI State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const canEdit = PERMISSIONS.CAN_MANAGE_USERS.includes(user.role);

    // Load data based on navigation level
    useEffect(() => {
        loadData();
    }, [navState]);

    const loadData = () => {
        switch (navState.level) {
            case 'schools':
                setSchools(getSchools().filter(s => s.isActive));
                break;
            case 'departments':
                if (navState.schoolId) {
                    setDepartments(getDepartmentsBySchool(navState.schoolId));
                }
                break;
            case 'colleges':
                if (navState.departmentId) {
                    setColleges(getCollegesByDepartment(navState.departmentId));
                }
                break;
            case 'tracks':
                if (navState.departmentId) {
                    setTracks(getTracksByDepartment(navState.departmentId));
                }
                break;
            case 'programs':
                if (navState.collegeId) {
                    setPrograms(getProgramsByCollege(navState.collegeId));
                }
                break;
            case 'strands':
                if (navState.trackId) {
                    setStrands(getStrandsByTrack(navState.trackId));
                }
                break;
            case 'majors':
                if (navState.programId) {
                    setMajors(getMajorsByProgram(navState.programId));
                }
                break;
            case 'yearLevels':
                if (navState.majorId) {
                    setYearLevels(getYearLevelsByParent(navState.majorId, 'major'));
                } else if (navState.programId) {
                    setYearLevels(getYearLevelsByParent(navState.programId, 'program'));
                } else if (navState.strandId) {
                    setYearLevels(getYearLevelsByParent(navState.strandId, 'strand'));
                } else if (navState.departmentId) {
                    setYearLevels(getYearLevelsByParent(navState.departmentId, 'department'));
                }
                break;
            case 'sections':
                if (navState.yearLevelId) {
                    setSections(getSectionsByYearLevel(navState.yearLevelId));
                }
                break;
            case 'members':
                if (navState.sectionId) {
                    setMembers(getUsersBySection(navState.sectionId));
                }
                break;
        }
    };

    // Navigation helpers
    const navigateTo = (newState: NavigationState, label: string) => {
        setBreadcrumbs(prev => [...prev, { label, level: navState.level, state: navState }]);
        setNavState(newState);
        setSearchQuery('');
    };

    const navigateBack = () => {
        if (breadcrumbs.length > 0) {
            const prev = breadcrumbs[breadcrumbs.length - 1];
            setBreadcrumbs(breadcrumbs.slice(0, -1));
            setNavState(prev.state);
            setSearchQuery('');
        }
    };

    const navigateToRoot = () => {
        setBreadcrumbs([]);
        setNavState({ level: 'schools' });
        setSearchQuery('');
    };

    const navigateToBreadcrumb = (index: number) => {
        const crumb = breadcrumbs[index];
        setBreadcrumbs(breadcrumbs.slice(0, index));
        setNavState(crumb.state);
        setSearchQuery('');
    };

    // Get current items based on level
    const getCurrentItems = (): any[] => {
        const query = searchQuery.toLowerCase();
        switch (navState.level) {
            case 'schools': return schools.filter(s => s.name.toLowerCase().includes(query));
            case 'departments': return departments.filter(d => d.name.toLowerCase().includes(query));
            case 'colleges': return colleges.filter(c => c.name.toLowerCase().includes(query));
            case 'tracks': return tracks.filter(t => t.name.toLowerCase().includes(query));
            case 'programs': return programs.filter(p => p.name.toLowerCase().includes(query));
            case 'strands': return strands.filter(s => s.name.toLowerCase().includes(query));
            case 'majors': return majors.filter(m => m.name.toLowerCase().includes(query));
            case 'yearLevels': return yearLevels.filter(y => y.name.toLowerCase().includes(query));
            case 'sections': return sections.filter(s => s.name.toLowerCase().includes(query));
            case 'members': return members.filter(m => 
                m.fullName?.toLowerCase().includes(query) || 
                m.username.toLowerCase().includes(query) ||
                m.studentId?.toLowerCase().includes(query)
            );
            default: return [];
        }
    };

    // Get level title
    const getLevelTitle = (): string => {
        switch (navState.level) {
            case 'schools': return 'Schools';
            case 'departments': return 'Departments';
            case 'colleges': return 'Colleges';
            case 'tracks': return 'Tracks';
            case 'programs': return 'Programs';
            case 'strands': return 'Strands';
            case 'majors': return 'Majors';
            case 'yearLevels': return 'Year Levels';
            case 'sections': return 'Sections';
            case 'members': return 'Members';
            default: return '';
        }
    };

    // Get level icon
    const getLevelIcon = () => {
        switch (navState.level) {
            case 'schools': return <Building2 size={20} />;
            case 'departments': return <Layers size={20} />;
            case 'colleges': return <GraduationCap size={20} />;
            case 'tracks': return <FolderTree size={20} />;
            case 'programs': return <BookOpen size={20} />;
            case 'strands': return <FolderTree size={20} />;
            case 'majors': return <BookOpen size={20} />;
            case 'yearLevels': return <SchoolIcon size={20} />;
            case 'sections': return <Users size={20} />;
            case 'members': return <UserIcon size={20} />;
            default: return null;
        }
    };

    // Handle item click
    const handleItemClick = (item: any) => {
        switch (navState.level) {
            case 'schools':
                navigateTo({ level: 'departments', schoolId: item.id }, item.name);
                break;
            case 'departments':
                const dept = item as Department;
                if (dept.type === 'TERTIARY') {
                    navigateTo({ ...navState, level: 'colleges', departmentId: item.id }, item.name);
                } else if (dept.type === 'SENIOR_HIGH') {
                    navigateTo({ ...navState, level: 'tracks', departmentId: item.id }, item.name);
                } else {
                    // Junior High - go directly to year levels
                    navigateTo({ ...navState, level: 'yearLevels', departmentId: item.id }, item.name);
                }
                break;
            case 'colleges':
                navigateTo({ ...navState, level: 'programs', collegeId: item.id }, item.name);
                break;
            case 'tracks':
                navigateTo({ ...navState, level: 'strands', trackId: item.id }, item.name);
                break;
            case 'programs':
                const program = item as Program;
                const hasMajors = getMajorsByProgram(program.id).length > 0;
                if (hasMajors) {
                    navigateTo({ ...navState, level: 'majors', programId: item.id }, item.name);
                } else {
                    navigateTo({ ...navState, level: 'yearLevels', programId: item.id }, item.name);
                }
                break;
            case 'strands':
                navigateTo({ ...navState, level: 'yearLevels', strandId: item.id }, item.name);
                break;
            case 'majors':
                navigateTo({ ...navState, level: 'yearLevels', majorId: item.id }, item.name);
                break;
            case 'yearLevels':
                navigateTo({ ...navState, level: 'sections', yearLevelId: item.id }, item.name);
                break;
            case 'sections':
                navigateTo({ ...navState, level: 'members', sectionId: item.id }, item.name);
                break;
            case 'members':
                setSelectedMember(item);
                setShowMemberModal(true);
                break;
        }
    };

    // Handle delete
    const handleDelete = (item: any) => {
        if (!confirm(`Are you sure you want to delete "${item.name || item.fullName}"?`)) return;
        
        switch (navState.level) {
            case 'schools': deleteSchool(item.id); break;
            case 'departments': deleteDepartment(item.id); break;
            case 'colleges': deleteCollege(item.id); break;
            case 'tracks': deleteTrack(item.id); break;
            case 'programs': deleteProgram(item.id); break;
            case 'strands': deleteStrand(item.id); break;
            case 'majors': deleteMajor(item.id); break;
            case 'yearLevels': deleteYearLevel(item.id); break;
            case 'sections': deleteSection(item.id); break;
        }
        loadData();
        showToast('Deleted successfully', 'success');
    };

    // Render card for each item
    const renderCard = (item: any) => {
        const isSchool = navState.level === 'schools';
        const isMember = navState.level === 'members';
        
        if (isMember) {
            const member = item as User;
            return (
                <div 
                    key={member.id}
                    className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleItemClick(member)}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 flex-shrink-0">
                            <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center text-amber-600 font-bold">
                                {member.fullName?.substring(0,2).toUpperCase() || member.username.substring(0,2).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-900 dark:text-white truncate">{member.fullName || member.username}</h3>
                            <p className="text-sm text-stone-500">@{member.username}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    member.role === UserRole.ADMIN ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>{member.role}</span>
                                {member.position && member.position !== UserPosition.NONE && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                        {member.position}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="text-stone-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                </div>
            );
        }

        // Use SchoolCard component for schools with dynamic border
        if (isSchool) {
            return (
                <SchoolCard
                    key={item.id}
                    school={item as School}
                    onClick={() => handleItemClick(item)}
                    onEdit={() => { setEditingItem(item); setShowCreateModal(true); }}
                    onDelete={() => handleDelete(item)}
                    canEdit={canEdit}
                    getLevelIcon={getLevelIcon}
                />
            );
        }

        return (
            <div 
                key={item.id}
                className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => handleItemClick(item)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                                {getLevelIcon()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-stone-900 dark:text-white truncate">{item.name}</h3>
                                {item.abbreviation && (
                                    <p className="text-xs text-stone-500">({item.abbreviation})</p>
                                )}
                            </div>
                        </div>

                        {navState.level === 'departments' && (
                            <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                item.type === 'TERTIARY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                item.type === 'SENIOR_HIGH' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                                {item.type === 'TERTIARY' ? 'Tertiary/College' : 
                                 item.type === 'SENIOR_HIGH' ? 'Senior High School' : 'Junior High School'}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {canEdit && navState.level !== 'members' && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingItem(item); setShowCreateModal(true); }}
                                    className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                        <ChevronRight className="text-stone-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-stone-800">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 flex-wrap mb-4 text-sm">
                        <button 
                            onClick={navigateToRoot}
                            className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                        >
                            <Home size={16} /> Schools
                        </button>
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                                <ChevronRight size={16} className="text-stone-400" />
                                <button 
                                    onClick={() => navigateToBreadcrumb(idx)}
                                    className="text-amber-600 hover:text-amber-700 font-medium truncate max-w-[150px]"
                                >
                                    {crumb.label}
                                </button>
                            </React.Fragment>
                        ))}
                        {breadcrumbs.length > 0 && (
                            <>
                                <ChevronRight size={16} className="text-stone-400" />
                                <span className="text-stone-700 dark:text-stone-300 font-semibold">{getLevelTitle()}</span>
                            </>
                        )}
                    </div>
                    
                    {/* Title & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {breadcrumbs.length > 0 && (
                                <button 
                                    onClick={navigateBack}
                                    className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                                    {getLevelIcon()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-stone-800 dark:text-white">{getLevelTitle()}</h2>
                                    <p className="text-sm text-stone-500">{getCurrentItems().length} items</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={`Search ${getLevelTitle().toLowerCase()}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>
                            
                            <button 
                                onClick={loadData}
                                className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                            >
                                <RefreshCcw size={18} />
                            </button>
                            
                            {/* View Toggle */}
                            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-sm'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-white dark:bg-stone-700 text-amber-600 shadow-sm'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                    title="List View"
                                >
                                    <List size={18} />
                                </button>
                            </div>
                            
                            {canEdit && navState.level !== 'members' && (
                                <button 
                                    onClick={() => { setEditingItem(null); setShowCreateModal(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                                >
                                    <Plus size={18} /> Add {getLevelTitle().slice(0, -1)}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Content Grid */}
                <div className="p-4 sm:p-6">
                    {getCurrentItems().length === 0 ? (
                        <div className="text-center py-12 text-stone-500">
                            <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                {getLevelIcon()}
                            </div>
                            <p className="font-medium">No {getLevelTitle().toLowerCase()} found</p>
                            {canEdit && navState.level !== 'members' && (
                                <button 
                                    onClick={() => { setEditingItem(null); setShowCreateModal(true); }}
                                    className="mt-4 text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1 mx-auto"
                                >
                                    <Plus size={16} /> Create your first {getLevelTitle().slice(0, -1).toLowerCase()}
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {getCurrentItems().map(item => renderCard(item))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {getCurrentItems().map(item => (
                                <div key={item.id} className="group">
                                    {navState.level === 'schools' ? (
                                        <SchoolListItem
                                            school={item as School}
                                            onClick={() => handleItemClick(item)}
                                            onEdit={() => { setEditingItem(item); setShowCreateModal(true); }}
                                            onDelete={() => handleDelete(item.id)}
                                            canEdit={canEdit}
                                        />
                                    ) : (
                                        <ListItem
                                            item={item}
                                            level={navState.level}
                                            onClick={() => handleItemClick(item)}
                                            onEdit={() => { setEditingItem(item); setShowCreateModal(true); }}
                                            onDelete={() => handleDelete(item.id)}
                                            canEdit={canEdit}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <CreateEditModal
                    level={navState.level}
                    navState={navState}
                    editingItem={editingItem}
                    user={user}
                    onClose={() => { setShowCreateModal(false); setEditingItem(null); }}
                    onSave={() => { setShowCreateModal(false); setEditingItem(null); loadData(); }}
                />
            )}

            {/* Member Detail Modal */}
            {showMemberModal && selectedMember && (
                <MemberDetailModal
                    member={selectedMember}
                    user={user}
                    onClose={() => { setShowMemberModal(false); setSelectedMember(null); }}
                    onUpdate={() => { loadData(); }}
                />
            )}
        </div>
    );
};

// ==========================================
// CREATE/EDIT MODAL
// ==========================================

interface CreateEditModalProps {
    level: NavigationLevel;
    navState: NavigationState;
    editingItem: any;
    user: User;
    onClose: () => void;
    onSave: () => void;
}

const CreateEditModal: React.FC<CreateEditModalProps> = ({ level, navState, editingItem, user, onClose, onSave }) => {
    const { showToast } = useToast();
    const isEditing = !!editingItem;
    
    // Form states
    const [name, setName] = useState(editingItem?.name || '');
    const [abbreviation, setAbbreviation] = useState(editingItem?.abbreviation || '');
    const [address, setAddress] = useState(editingItem?.address || '');
    const [logoUrl, setLogoUrl] = useState(editingItem?.logoUrl || '');
    const [googleMapUrl, setGoogleMapUrl] = useState(editingItem?.googleMapUrl || '');
    const [contactNumber, setContactNumber] = useState(editingItem?.contactNumber || '');
    const [socialLinks, setSocialLinks] = useState<{id: string; platform: string; url: string}[]>(editingItem?.socialLinks || []);
    const [departmentType, setDepartmentType] = useState<DepartmentType>(editingItem?.type || 'TERTIARY');
    const [trackType, setTrackType] = useState<SeniorHighTrack>(editingItem?.type || 'ACADEMIC');
    const [fullName, setFullName] = useState(editingItem?.fullName || '');
    const [order, setOrder] = useState<number>(editingItem?.order || 1);
    
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        if (!name.trim()) {
            showToast('Name is required', 'error');
            return;
        }
        
        setIsSaving(true);
        try {
            switch (level) {
                case 'schools':
                    if (isEditing) {
                        updateSchool({ ...editingItem, name, address, logoUrl, googleMapUrl, contactNumber, socialLinks });
                    } else {
                        addSchool({ name, address, logoUrl, googleMapUrl, contactNumber, socialLinks, createdBy: user.id, isActive: true });
                    }
                    break;
                case 'departments':
                    if (isEditing) {
                        updateDepartment({ ...editingItem, name, type: departmentType });
                    } else {
                        addDepartment({ 
                            name, 
                            type: departmentType, 
                            schoolId: navState.schoolId!, 
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'colleges':
                    if (isEditing) {
                        updateCollege({ ...editingItem, name, abbreviation });
                    } else {
                        const dept = getDepartments().find(d => d.id === navState.departmentId);
                        addCollege({ 
                            name, 
                            abbreviation,
                            departmentId: navState.departmentId!, 
                            schoolId: dept?.schoolId || navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'tracks':
                    if (isEditing) {
                        updateTrack({ ...editingItem, name, type: trackType });
                    } else {
                        const dept2 = getDepartments().find(d => d.id === navState.departmentId);
                        addTrack({ 
                            name, 
                            type: trackType,
                            departmentId: navState.departmentId!, 
                            schoolId: dept2?.schoolId || navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'programs':
                    if (isEditing) {
                        updateProgram({ ...editingItem, name, abbreviation });
                    } else {
                        const college = getColleges().find(c => c.id === navState.collegeId);
                        addProgram({ 
                            name, 
                            abbreviation,
                            collegeId: navState.collegeId!, 
                            departmentId: college?.departmentId || navState.departmentId!,
                            schoolId: college?.schoolId || navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'strands':
                    if (isEditing) {
                        updateStrand({ ...editingItem, name, fullName });
                    } else {
                        const track = getTracks().find(t => t.id === navState.trackId);
                        addStrand({ 
                            name, 
                            fullName,
                            trackId: navState.trackId!, 
                            departmentId: track?.departmentId || navState.departmentId!,
                            schoolId: track?.schoolId || navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'majors':
                    if (isEditing) {
                        updateMajor({ ...editingItem, name });
                    } else {
                        const program = getPrograms().find(p => p.id === navState.programId);
                        addMajor({ 
                            name, 
                            programId: navState.programId!, 
                            collegeId: program?.collegeId || navState.collegeId!,
                            departmentId: program?.departmentId || navState.departmentId!,
                            schoolId: program?.schoolId || navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'yearLevels':
                    if (isEditing) {
                        updateYearLevel({ ...editingItem, name, order });
                    } else {
                        addYearLevel({ 
                            name, 
                            order,
                            majorId: navState.majorId,
                            programId: navState.programId,
                            strandId: navState.strandId,
                            departmentId: navState.departmentId!,
                            schoolId: navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
                case 'sections':
                    if (isEditing) {
                        updateSection({ ...editingItem, name });
                    } else {
                        const yearLevel = getYearLevels().find(y => y.id === navState.yearLevelId);
                        addSection({ 
                            name, 
                            yearLevelId: navState.yearLevelId!,
                            majorId: yearLevel?.majorId || navState.majorId,
                            programId: yearLevel?.programId || navState.programId,
                            collegeId: navState.collegeId,
                            strandId: yearLevel?.strandId || navState.strandId,
                            trackId: navState.trackId,
                            departmentId: yearLevel?.departmentId || navState.departmentId!,
                            schoolId: yearLevel?.schoolId || navState.schoolId!,
                            createdBy: user.id, 
                            isActive: true 
                        });
                    }
                    break;
            }
            
            showToast(isEditing ? 'Updated successfully' : 'Created successfully', 'success');
            onSave();
        } catch (error) {
            showToast('Failed to save', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const addSocialLink = () => {
        setSocialLinks([...socialLinks, { id: `social_${Date.now()}`, platform: 'Website', url: '' }]);
    };

    const updateSocialLink = (id: string, field: 'platform' | 'url', value: string) => {
        setSocialLinks(socialLinks.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeSocialLink = (id: string) => {
        setSocialLinks(socialLinks.filter(l => l.id !== id));
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                            {isEditing ? 'Edit' : 'Create'} {level === 'schools' ? 'School' : level.slice(0, -1).charAt(0).toUpperCase() + level.slice(1, -1)}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Name field - always present */}
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Name *</label>
                            <input
                                type="text"
                                value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={level === 'schools' ? 'University of Southeastern Philippines' : 'Enter name'}
                            className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                    </div>

                    {/* School-specific fields */}
                    {level === 'schools' && (
                        <>
                            {/* School Logo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">School Logo</label>
                                <div className="flex items-start gap-4">
                                    {logoUrl && (
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex-shrink-0">
                                            <img src={getImageUrl(logoUrl)} alt="School Logo" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <FileUploader
                                            label="Upload Logo"
                                            initialUrl={logoUrl}
                                            onUpload={(url) => setLogoUrl(url)}
                                            accept="image/*"
                                            uploadAction="uploadSchoolLogo"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="School address"
                                    className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Google Maps Link</label>
                                <input
                                    type="url"
                                    value={googleMapUrl}
                                    onChange={(e) => setGoogleMapUrl(e.target.value)}
                                    placeholder="https://maps.google.com/... or https://maps.app.goo.gl/..."
                                    className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                                {googleMapUrl && (
                                    <div className="mt-2">
                                        {getGoogleMapsEmbedUrl(googleMapUrl) ? (
                                            <div className="rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
                                                <iframe
                                                    src={getGoogleMapsEmbedUrl(googleMapUrl)!}
                                                    width="100%"
                                                    height="200"
                                                    style={{ border: 0 }}
                                                    allowFullScreen
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                                    <MapPin size={16} />
                                                    <span>Shortened Google Maps links can't be previewed, but the link will work when clicked.</span>
                                                </p>
                                                <a 
                                                    href={googleMapUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                >
                                                    <ExternalLink size={14} /> Open in Google Maps
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Contact Number (Optional)</label>
                                <input
                                    type="tel"
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    placeholder="+63 XXX XXX XXXX"
                                    className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Social Media</label>
                                    <button onClick={addSocialLink} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                                        <Plus size={14} /> Add Link
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {socialLinks.map(link => (
                                        <div key={link.id} className="flex items-center gap-2">
                                            <select
                                                value={link.platform}
                                                onChange={(e) => updateSocialLink(link.id, 'platform', e.target.value)}
                                                className="px-2 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg"
                                            >
                                                <option value="Website">Website</option>
                                                <option value="Facebook">Facebook</option>
                                                <option value="Twitter">Twitter</option>
                                                <option value="Instagram">Instagram</option>
                                                <option value="LinkedIn">LinkedIn</option>
                                            </select>
                                            <input
                                                type="url"
                                                value={link.url}
                                                onChange={(e) => updateSocialLink(link.id, 'url', e.target.value)}
                                                placeholder="https://..."
                                                className="flex-1 px-3 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg"
                                            />
                                            <button onClick={() => removeSocialLink(link.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Department type */}
                    {level === 'departments' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Department Type *</label>
                            <select
                                value={departmentType}
                                onChange={(e) => setDepartmentType(e.target.value as DepartmentType)}
                                className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="TERTIARY">Tertiary / College</option>
                                <option value="SENIOR_HIGH">Senior High School</option>
                                <option value="JUNIOR_HIGH">Junior High School</option>
                            </select>
                        </div>
                    )}

                    {/* Track type for Senior High */}
                    {level === 'tracks' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Track Type *</label>
                            <select
                                value={trackType}
                                onChange={(e) => setTrackType(e.target.value as SeniorHighTrack)}
                                className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="ACADEMIC">Academic Track</option>
                                <option value="TVL">Technical-Vocational-Livelihood (TVL)</option>
                                <option value="SPORTS">Sports Track</option>
                                <option value="ARTS_DESIGN">Arts & Design Track</option>
                            </select>
                        </div>
                    )}

                    {/* Abbreviation for colleges and programs */}
                    {(level === 'colleges' || level === 'programs') && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Abbreviation</label>
                            <input
                                type="text"
                                value={abbreviation}
                                onChange={(e) => setAbbreviation(e.target.value)}
                                placeholder={level === 'colleges' ? 'CTET' : 'BSEd'}
                                className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            />
                        </div>
                    )}

                    {/* Full name for strands */}
                    {level === 'strands' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Science, Technology, Engineering and Mathematics"
                                className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            />
                        </div>
                    )}

                    {/* Order for year levels */}
                    {level === 'yearLevels' && (
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Order (for sorting)</label>
                            <input
                                type="number"
                                value={order}
                                onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                                min={1}
                                className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            />
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-stone-200 dark:border-stone-700 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} /> {isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                    </button>
                </div>
                </div>
            </div>
        </ModalPortal>
    );
};

// ==========================================
// MEMBER DETAIL MODAL
// ==========================================

interface MemberDetailModalProps {
    member: User;
    user: User;
    onClose: () => void;
    onUpdate: () => void;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({ member, user, onClose, onUpdate }) => {
    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<User>>({ ...member });
    const canEdit = PERMISSIONS.CAN_MANAGE_USERS.includes(user.role);

    const handleSave = () => {
        const updated = { ...member, ...editForm } as User;
        updateUser(updated);
        logAccess(user.id, 'USER_MGMT', `Updated profile of ${updated.username}`);
        showToast('Profile updated', 'success');
        setIsEditing(false);
        onUpdate();
    };

    const handleResetPassword = () => {
        const subject = encodeURIComponent('ClassSync Password Reset');
        const body = encodeURIComponent(`Hello ${member.fullName},\n\nYour password has been reset.\n\nPlease use this link to set a new password:\n${window.location.origin}/#/reset-password?email=${member.email}\n\n- ClassSync Admin`);
        window.open(`mailto:${member.email}?subject=${subject}&body=${body}`, '_blank');
        showToast('Password reset email prepared', 'success');
    };

    const updateField = (field: keyof User, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="relative h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
                            <X size={20} />
                        </button>
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                                member.role === UserRole.ADMIN ? 'bg-red-600' : 'bg-stone-600'
                            }`}>{member.role}</span>
                            {member.position && member.position !== UserPosition.NONE && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-purple-600">{member.position}</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Avatar */}
                    <div className="relative px-6 -mt-12">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1 shadow-xl">
                            <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center text-2xl font-bold text-amber-600">
                                {member.fullName?.substring(0,2).toUpperCase() || member.username.substring(0,2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-6 pt-4 pb-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="mb-4">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.fullName || ''}
                                onChange={(e) => updateField('fullName', e.target.value)}
                                className="text-xl font-bold bg-transparent border-b-2 border-amber-500 focus:outline-none w-full dark:text-white"
                            />
                        ) : (
                            <h2 className="text-xl font-bold text-stone-900 dark:text-white">{member.fullName || member.username}</h2>
                        )}
                        <p className="text-stone-500">@{member.username}</p>
                    </div>

                    {/* Admin Controls */}
                    {canEdit && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                                <Shield size={16} /> Admin Controls
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-stone-500 block mb-1">Role</label>
                                    <CustomSelect
                                        value={isEditing ? editForm.role || member.role : member.role}
                                        onChange={(val) => updateField('role', val as UserRole)}
                                        options={Object.values(UserRole).map(r => ({ value: r, label: r }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500 block mb-1">Position</label>
                                    <CustomSelect
                                        value={isEditing ? editForm.position || UserPosition.NONE : member.position || UserPosition.NONE}
                                        onChange={(val) => updateField('position', val as UserPosition)}
                                        options={Object.values(UserPosition).map(p => ({ value: p, label: p === UserPosition.NONE ? '- None -' : p }))}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleResetPassword}
                                className="mt-3 w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
                            >
                                <Key size={16} /> Send Password Reset
                            </button>
                        </div>
                    )}

                    {/* Info fields */}
                    <div className="space-y-3">
                        <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl">
                            <p className="text-xs text-stone-500 flex items-center gap-1"><Mail size={12} /> Email</p>
                            {isEditing ? (
                                <input type="email" value={editForm.email || ''} onChange={(e) => updateField('email', e.target.value)} className="w-full text-sm bg-transparent border-b border-stone-300 focus:outline-none dark:text-stone-300" />
                            ) : (
                                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{member.email}</p>
                            )}
                        </div>
                        <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl">
                            <p className="text-xs text-stone-500 flex items-center gap-1"><Phone size={12} /> Contact</p>
                            {isEditing ? (
                                <input type="tel" value={editForm.contactNumber || ''} onChange={(e) => updateField('contactNumber', e.target.value)} className="w-full text-sm bg-transparent border-b border-stone-300 focus:outline-none dark:text-stone-300" placeholder="+63..." />
                            ) : (
                                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{member.contactNumber || '-'}</p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    {canEdit && (
                        isEditing ? (
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditing(false); setEditForm({ ...member }); }} className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg text-sm">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm flex items-center gap-2"><Save size={16} /> Save</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm flex items-center gap-2"><Edit3 size={16} /> Edit</button>
                        )
                    )}
                    <button onClick={onClose} className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg text-sm">Close</button>
                </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default SchoolManagement;
