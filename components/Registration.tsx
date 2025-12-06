import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, School, Upload, Plus, X, Check, 
    Loader2, AlertCircle, Eye, EyeOff, ChevronRight, ChevronLeft,
    Globe, Github, Linkedin, Facebook, Instagram, Twitter, Link as LinkIcon,
    UserCircle, Building, GraduationCap, Heart, Lock, CheckCircle2,
    Home, ArrowLeft, RotateCcw, XCircle, ChevronDown, Search
} from 'lucide-react';
import { useToast } from './ui/Toast';
import { 
    getSchools, getDepartments, getColleges, getPrograms, getMajors,
    getTracks, getStrands, getYearLevels, getSections
} from '../services/dataService';
import { 
    School as SchoolType, Department, College, Program, Major, 
    Track, Strand, YearLevel, Section, DepartmentType 
} from '../types';

// Social link detection
const SOCIAL_PLATFORMS: Record<string, { icon: React.ReactNode; name: string; pattern: RegExp }> = {
    facebook: { icon: <Facebook size={16} />, name: 'Facebook', pattern: /facebook\.com|fb\.com/i },
    instagram: { icon: <Instagram size={16} />, name: 'Instagram', pattern: /instagram\.com/i },
    twitter: { icon: <Twitter size={16} />, name: 'Twitter/X', pattern: /twitter\.com|x\.com/i },
    linkedin: { icon: <Linkedin size={16} />, name: 'LinkedIn', pattern: /linkedin\.com/i },
    github: { icon: <Github size={16} />, name: 'GitHub', pattern: /github\.com/i },
    default: { icon: <Globe size={16} />, name: 'Website', pattern: /.*/ }
};

const detectPlatform = (url: string) => {
    for (const [key, platform] of Object.entries(SOCIAL_PLATFORMS)) {
        if (key !== 'default' && platform.pattern.test(url)) {
            return { key, ...platform };
        }
    }
    return { key: 'default', ...SOCIAL_PLATFORMS.default };
};

interface SocialLink {
    id: string;
    url: string;
    platform: string;
}

interface RegistrationData {
    studentId: string;
    universityEmail: string;
    fullName: string;
    contactNumber: string;
    personalEmail: string;
    avatar: string;
    avatarFileId: string;
    avatarPreview: string;
    socialLinks: SocialLink[];
    province: string;
    city: string;
    barangay: string;
    purokHouseNumber: string;
    // School structure IDs (for linking to school structure data)
    schoolId: string;
    departmentId: string;
    collegeId: string;
    programId: string;
    majorId: string;
    trackId: string;
    strandId: string;
    yearLevelId: string;
    sectionId: string;
    // Display values (text fallback)
    school: string;
    college: string;
    program: string;
    major: string;
    yearLevel: string;
    section: string;
    emergencyPerson: string;
    emergencyContact: string;
    username: string;
    password: string;
    confirmPassword: string;
}

interface ProgressStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    errorCode?: string;
    errorMessage?: string;
}

interface ValidationResult {
    isValid: boolean;
    field: string;
    message: string;
}

interface RegistrationProps {
    onComplete: (user: any) => void;
    onCancel: () => void;
    logoUrl: string;
    appName: string;
}

// GAS Backend URL - Used for file uploads and OTP email sending
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzCWKJ8DnTaBeBdfxYg2F7kXdOwLkarDDL1zZuG6FL4lLUTpm7x-JIxiilMXOAsSBYm/exec';
const isDevMode = false; // Set to true for local testing without GAS

// Input field component with consistent styling
const InputField: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    icon?: React.ReactNode;
    error?: string;
    pattern?: string;
    minLength?: number;
    hint?: string;
    rightElement?: React.ReactNode;
}> = ({ label, name, value, onChange, type = 'text', placeholder, required, icon, error, pattern, minLength, hint, rightElement }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    {icon}
                </div>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                pattern={pattern}
                minLength={minLength}
                required={required}
                className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-10' : 'pr-4'} py-2.5 border-2 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-stone-300 dark:border-stone-600 focus:border-amber-500 focus:ring-amber-200 dark:focus:ring-amber-800'} rounded-lg focus:ring-2 outline-none transition-all bg-white dark:bg-stone-800 dark:text-white text-sm`}
            />
            {rightElement && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {rightElement}
                </div>
            )}
        </div>
        {hint && !error && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{hint}</p>}
        {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
);

// Select field component
const SelectField: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
    required?: boolean;
    icon?: React.ReactNode;
    error?: string;
}> = ({ label, name, value, onChange, options, required, icon, error }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10">
                    {icon}
                </div>
            )}
            <select
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border-2 ${error ? 'border-red-400' : 'border-stone-300 dark:border-stone-600 focus:border-amber-500'} rounded-lg focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 outline-none transition-all bg-white dark:bg-stone-800 dark:text-white text-sm appearance-none cursor-pointer`}
            >
                <option value="">Select...</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 rotate-90 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
);

// Autocomplete Select Field for school structure
const AutocompleteField: React.FC<{
    label: string;
    value: string;
    displayValue: string;
    options: { id: string; name: string }[];
    onChange: (id: string, name: string) => void;
    required?: boolean;
    icon?: React.ReactNode;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    allowCustom?: boolean;
}> = ({ label, value, displayValue, options, onChange, required, icon, error, placeholder, disabled, allowCustom }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt => 
            opt.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSelect = (opt: { id: string; name: string }) => {
        onChange(opt.id, opt.name);
        setIsOpen(false);
        setSearchTerm('');
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (!isOpen) setIsOpen(true);
        // If custom values allowed and typing, update the display value
        if (allowCustom) {
            onChange('', val);
        }
    };
    
    const handleInputFocus = () => {
        if (!disabled && options.length > 0) {
            setIsOpen(true);
        }
    };
    
    return (
        <div className="w-full" ref={dropdownRef}>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10">
                        {icon}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchTerm : displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={placeholder || `Select ${label}...`}
                    disabled={disabled}
                    className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 border-2 ${error ? 'border-red-400' : 'border-stone-300 dark:border-stone-600 focus:border-amber-500'} rounded-lg focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 outline-none transition-all bg-white dark:bg-stone-800 dark:text-white text-sm ${disabled ? 'bg-stone-100 dark:bg-stone-900 cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {displayValue && !disabled && (
                        <button
                            type="button"
                            onClick={() => { onChange('', ''); setSearchTerm(''); }}
                            className="text-stone-400 hover:text-red-500 p-0.5"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Dropdown */}
                {isOpen && !disabled && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 rounded-lg shadow-xl max-h-48 overflow-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-stone-500 text-center">
                                {options.length === 0 ? 'No options available' : 'No matches found'}
                                {allowCustom && searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelect({ id: '', name: searchTerm })}
                                        className="block w-full mt-2 text-amber-600 hover:text-amber-700"
                                    >
                                        Use "{searchTerm}"
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelect(opt)}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 dark:hover:bg-stone-700 transition-colors ${value === opt.id ? 'bg-amber-100 dark:bg-stone-700 text-amber-700 dark:text-amber-400 font-medium' : 'text-stone-700 dark:text-stone-300'}`}
                                >
                                    {opt.name}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
        </div>
    );
};

// Progress Toast Component - Positioned bottom-right on desktop, center-bottom on mobile
const ProgressToast: React.FC<{
    steps: ProgressStep[];
    onClose: () => void;
    onRetry: () => void;
    isComplete: boolean;
}> = ({ steps, onClose, onRetry }) => {
    const hasError = steps.some(s => s.status === 'error');
    const allSuccess = steps.every(s => s.status === 'success');
    
    return (
        <div className="fixed z-50 
            bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm
            md:bottom-6 md:right-6 md:left-auto md:translate-x-0 md:w-80">
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden animate-in">
                <div className={`p-3 ${allSuccess ? 'bg-green-500' : hasError ? 'bg-red-500' : 'bg-amber-600'} text-white`}>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                            {allSuccess ? 'Application Submitted!' : hasError ? 'Submission Failed' : 'Submitting Application...'}
                        </span>
                        {(allSuccess || hasError) && (
                            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="p-4 space-y-3">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                                step.status === 'success' ? 'bg-green-500 text-white' :
                                step.status === 'error' ? 'bg-red-500 text-white' :
                                step.status === 'loading' ? 'bg-amber-500 text-white' :
                                'bg-stone-200 dark:bg-stone-700 text-stone-500'
                            }`}>
                                {step.status === 'success' && <Check size={12} />}
                                {step.status === 'error' && <X size={12} />}
                                {step.status === 'loading' && <Loader2 size={12} className="animate-spin" />}
                                {step.status === 'pending' && <span>{index + 1}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${
                                    step.status === 'success' ? 'text-green-600 dark:text-green-400' :
                                    step.status === 'error' ? 'text-red-600 dark:text-red-400' :
                                    step.status === 'loading' ? 'text-amber-600 dark:text-amber-400' :
                                    'text-stone-500 dark:text-stone-400'
                                }`}>
                                    {step.label}
                                </p>
                                {step.status === 'error' && step.errorMessage && (
                                    <p className="text-xs text-red-500 truncate">{step.errorMessage}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                {hasError && (
                    <div className="p-3 border-t border-stone-200 dark:border-stone-700 flex gap-2">
                        <button onClick={onClose} className="flex-1 px-3 py-2 text-sm bg-stone-100 dark:bg-stone-700 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">
                            Close
                        </button>
                        <button onClick={onRetry} className="flex-1 px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                            Retry
                        </button>
                    </div>
                )}
                
                {allSuccess && (
                    <div className="p-4 border-t border-stone-200 dark:border-stone-700 text-center">
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                            Your application is pending admin approval. You will be notified once activated.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const Registration: React.FC<RegistrationProps> = ({ onComplete, onCancel, logoUrl, appName }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    
    // Check if this is a retry from a rejected application
    const retryState = location.state as { 
        retryApplication?: any; 
        attemptNumber?: number;
        fieldsToCorrect?: { field: string; issue: string }[];
        correctionMode?: boolean;
    } | null;
    const isRetryMode = !!retryState?.retryApplication;
    const retryApp = retryState?.retryApplication;
    const attemptNumber = retryState?.attemptNumber || 1;
    const fieldsToCorrect = retryState?.fieldsToCorrect || [];
    const isCorrectionMode = retryState?.correctionMode && fieldsToCorrect.length > 0;
    
    const [currentStep, setCurrentStep] = useState(isCorrectionMode ? 4 : 1); // Step 4 = correction only mode
    const [isLoading, setIsLoading] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [newSocialLink, setNewSocialLink] = useState('');
    const [showProgressToast, setShowProgressToast] = useState(false);
    const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    
    // OTP Timer State
    const [otpTimer, setOtpTimer] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (otpTimer > 0) {
            timerRef.current = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [otpTimer]);

    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState<RegistrationData>(() => {
        // Pre-fill from retry application if available
        if (retryApp) {
            return {
                studentId: retryApp.studentId || '',
                universityEmail: retryApp.universityEmail || '',
                fullName: retryApp.fullName || '',
                contactNumber: retryApp.contactNumber || '',
                personalEmail: retryApp.personalEmail || '',
                avatar: retryApp.avatar || '',
                avatarFileId: retryApp.avatarFileId || '',
                avatarPreview: retryApp.avatar || '',
                socialLinks: retryApp.socialLinks || [],
                province: retryApp.province || '',
                city: retryApp.city || '',
                barangay: retryApp.barangay || '',
                purokHouseNumber: retryApp.purokHouseNumber || '',
                // School structure IDs
                schoolId: retryApp.schoolId || '',
                departmentId: retryApp.departmentId || '',
                collegeId: retryApp.collegeId || '',
                programId: retryApp.programId || '',
                majorId: retryApp.majorId || '',
                trackId: retryApp.trackId || '',
                strandId: retryApp.strandId || '',
                yearLevelId: retryApp.yearLevelId || '',
                sectionId: retryApp.sectionId || '',
                // Display values
                school: retryApp.school || '',
                college: retryApp.college || '',
                program: retryApp.program || '',
                major: retryApp.major || '',
                yearLevel: retryApp.yearLevel || '',
                section: retryApp.section || '',
                emergencyPerson: retryApp.emergencyPerson || '',
                emergencyContact: retryApp.emergencyContact || '',
                username: retryApp.username || '',
                password: '', // Don't pre-fill password
                confirmPassword: ''
            };
        }
        return {
            studentId: '',
            universityEmail: '',
            fullName: '',
            contactNumber: '',
            personalEmail: '',
            avatar: '',
            avatarFileId: '',
            avatarPreview: '',
            socialLinks: [],
            province: '',
            city: '',
            barangay: '',
            purokHouseNumber: '',
            // School structure IDs
            schoolId: '',
            departmentId: '',
            collegeId: '',
            programId: '',
            majorId: '',
            trackId: '',
            strandId: '',
            yearLevelId: '',
            sectionId: '',
            // Display values
            school: '',
            college: '',
            program: '',
            major: '',
            yearLevel: '',
            section: '',
            emergencyPerson: '',
            emergencyContact: '',
            username: '',
            password: '',
            confirmPassword: ''
        };
    });
    
    // School structure data state
    const [schoolStructure, setSchoolStructure] = useState<{
        schools: SchoolType[];
        departments: Department[];
        colleges: College[];
        programs: Program[];
        majors: Major[];
        tracks: Track[];
        strands: Strand[];
        yearLevels: YearLevel[];
        sections: Section[];
    }>({
        schools: [],
        departments: [],
        colleges: [],
        programs: [],
        majors: [],
        tracks: [],
        strands: [],
        yearLevels: [],
        sections: []
    });
    
    // Load school structure data on mount
    useEffect(() => {
        setSchoolStructure({
            schools: getSchools(),
            departments: getDepartments(),
            colleges: getColleges(),
            programs: getPrograms(),
            majors: getMajors(),
            tracks: getTracks(),
            strands: getStrands(),
            yearLevels: getYearLevels(),
            sections: getSections()
        });
    }, []);
    
    // Determine department type based on selected department
    const selectedDepartment = useMemo(() => {
        return schoolStructure.departments.find(d => d.id === formData.departmentId);
    }, [schoolStructure.departments, formData.departmentId]);
    
    const departmentType = selectedDepartment?.type;
    
    // Filter cascading options based on selections
    const filteredDepartments = useMemo(() => {
        if (!formData.schoolId) return [];
        return schoolStructure.departments.filter(d => d.schoolId === formData.schoolId);
    }, [schoolStructure.departments, formData.schoolId]);
    
    const filteredColleges = useMemo(() => {
        if (!formData.departmentId) return [];
        return schoolStructure.colleges.filter(c => c.departmentId === formData.departmentId);
    }, [schoolStructure.colleges, formData.departmentId]);
    
    const filteredPrograms = useMemo(() => {
        if (!formData.collegeId) return [];
        return schoolStructure.programs.filter(p => p.collegeId === formData.collegeId);
    }, [schoolStructure.programs, formData.collegeId]);
    
    const filteredMajors = useMemo(() => {
        if (!formData.programId) return [];
        return schoolStructure.majors.filter(m => m.programId === formData.programId);
    }, [schoolStructure.majors, formData.programId]);
    
    const filteredTracks = useMemo(() => {
        if (!formData.departmentId) return [];
        return schoolStructure.tracks.filter(t => t.departmentId === formData.departmentId);
    }, [schoolStructure.tracks, formData.departmentId]);
    
    const filteredStrands = useMemo(() => {
        if (!formData.trackId) return [];
        return schoolStructure.strands.filter(s => s.trackId === formData.trackId);
    }, [schoolStructure.strands, formData.trackId]);
    
    const filteredYearLevels = useMemo(() => {
        // For Tertiary: filter by programId (or majorId if available)
        // For Senior High: filter by strandId
        // For Junior High: filter by departmentId
        if (departmentType === 'TERTIARY') {
            if (formData.majorId) {
                return schoolStructure.yearLevels.filter(y => y.majorId === formData.majorId);
            }
            if (formData.programId) {
                return schoolStructure.yearLevels.filter(y => y.programId === formData.programId);
            }
        } else if (departmentType === 'SENIOR_HIGH') {
            if (formData.strandId) {
                return schoolStructure.yearLevels.filter(y => y.strandId === formData.strandId);
            }
        } else if (departmentType === 'JUNIOR_HIGH') {
            if (formData.departmentId) {
                return schoolStructure.yearLevels.filter(y => y.departmentId === formData.departmentId);
            }
        }
        return [];
    }, [schoolStructure.yearLevels, departmentType, formData.programId, formData.majorId, formData.strandId, formData.departmentId]);
    
    const filteredSections = useMemo(() => {
        if (!formData.yearLevelId) return [];
        return schoolStructure.sections.filter(s => s.yearLevelId === formData.yearLevelId);
    }, [schoolStructure.sections, formData.yearLevelId]);
    
    // Handle school structure selection changes (cascading reset)
    const handleSchoolSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            schoolId: id,
            school: name,
            departmentId: '',
            collegeId: '',
            college: '',
            programId: '',
            program: '',
            majorId: '',
            major: '',
            trackId: '',
            strandId: '',
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleDepartmentSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            departmentId: id,
            collegeId: '',
            college: '',
            programId: '',
            program: '',
            majorId: '',
            major: '',
            trackId: '',
            strandId: '',
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleCollegeSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            collegeId: id,
            college: name,
            programId: '',
            program: '',
            majorId: '',
            major: '',
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleProgramSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            programId: id,
            program: name,
            majorId: '',
            major: '',
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleMajorSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            majorId: id,
            major: name,
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleTrackSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            trackId: id,
            strandId: '',
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleStrandSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            strandId: id,
            yearLevelId: '',
            yearLevel: '',
            sectionId: '',
            section: ''
        }));
    };
    
    const handleYearLevelSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            yearLevelId: id,
            yearLevel: name,
            sectionId: '',
            section: ''
        }));
    };
    
    const handleSectionSelect = (id: string, name: string) => {
        setFormData(prev => ({
            ...prev,
            sectionId: id,
            section: name
        }));
    };

    // Listen for background application sync failures and provide retry action
    useEffect(() => {
        const handler = async (e: any) => {
            const failedId = e?.detail?.id as string | undefined;
            if (!failedId) return;

            showToast('Failed to link application to cloud', 'warning', 'Retry sync', async () => {
                try {
                    const [{ getApplicationById }, { dbRefs, dbHelpers }] = await Promise.all([
                        import('../services/dataService'),
                        import('../services/firebase')
                    ]);
                    const app = getApplicationById(failedId);
                    if (!app) {
                        showToast('Local application not found', 'error');
                        return;
                    }
                    await dbHelpers.setData(dbRefs.application(app.id), app);
                    showToast('Application synced to Firebase', 'success');
                } catch (err) {
                    console.error('Retry sync error:', err);
                    showToast('Retry failed. Check Firebase rules or network.', 'error');
                }
            });
        };

        window.addEventListener('applicationSyncFailed', handler as EventListener);
        return () => window.removeEventListener('applicationSyncFailed', handler as EventListener);
    }, [showToast]);

    // Validation functions
    const validateDuplicates = useCallback(async (): Promise<ValidationResult[]> => {
        const results: ValidationResult[] = [];
        
        try {
            const { getUsers, checkExistingApplication } = await import('../services/dataService');
            const users = getUsers();
            
            // Check for existing user with same username
            const existingUserByUsername = users.find(u => 
                u.username.toLowerCase() === formData.username.toLowerCase()
            );
            if (existingUserByUsername) {
                results.push({ isValid: false, field: 'username', message: 'Username is already taken' });
            }
            
            // Check for existing user with same email
            const existingUserByEmail = users.find(u => 
                u.email?.toLowerCase() === formData.universityEmail.toLowerCase() ||
                (u as any).personalEmail?.toLowerCase() === formData.universityEmail.toLowerCase()
            );
            if (existingUserByEmail) {
                results.push({ isValid: false, field: 'universityEmail', message: 'Email is already registered' });
            }
            
            // Check for existing user with same contact
            if (formData.contactNumber) {
                const existingUserByContact = users.find(u => 
                    (u as any).contactNumber === formData.contactNumber
                );
                if (existingUserByContact) {
                    results.push({ isValid: false, field: 'contactNumber', message: 'Contact number is already registered' });
                }
            }
            
            // Check for existing user with same full name (warning, not blocking)
            const existingUserByName = users.find(u => 
                u.fullName?.toLowerCase() === formData.fullName.toLowerCase()
            );
            if (existingUserByName) {
                // Just a warning, doesn't block
                showToast('Note: A user with this name already exists', 'warning');
            }
            
            // Check pending applications
            const existingApp = checkExistingApplication(formData.studentId, formData.universityEmail);
            if (existingApp) {
                results.push({ isValid: false, field: 'studentId', message: 'An application with this Student ID or email is already pending' });
            }
            
        } catch (error) {
            console.error('Validation error:', error);
        }
        
        return results;
    }, [formData, showToast]);

    // Validate Student ID format locally
    const validateStudentId = (studentId: string): { success: boolean; error?: string } => {
        const idPattern = /^\d{4}-\d{5}$/;
        if (!idPattern.test(studentId)) {
            return { success: false, error: 'Invalid Student ID format. Use format: YYYY-NNNNN (e.g., 2024-12345)' };
        }
        return { success: true };
    };

    // Validate email format locally
    const validateEmailFormat = (email: string): { success: boolean; error?: string } => {
        if (!email.endsWith('.edu') && !email.endsWith('.edu.ph')) {
            return { success: false, error: 'Please use a valid .edu or .edu.ph email address' };
        }
        return { success: true };
    };

    // Send OTP via GAS backend (real email in production, simulated in dev)
    const sendOTPToEmail = async (email: string): Promise<{ success: boolean; error?: string; devOtp?: string }> => {
        // In dev mode, simulate OTP
        if (isDevMode) {
            await new Promise(r => setTimeout(r, 800));
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(otp);
            console.log(`[Dev Mode] OTP for ${email}: ${otp}`);
            return { success: true, devOtp: otp };
        }
        
        // Production: Call GAS backend to send real email
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ 
                    action: 'sendOTP', 
                    payload: { 
                        email,
                        studentId: formData.studentId,
                        type: 'registration'
                    } 
                })
            });
            const result = await response.json();
            
            if (result.success) {
                // Store OTP reference for verification (GAS stores actual OTP in sheet)
                setGeneratedOtp(result.otpRef || 'pending');
            }
            
            return result;
        } catch (error) {
            console.error('Send OTP error:', error);
            return { success: false, error: 'Failed to send verification code. Please try again.' };
        }
    };

    // Verify OTP (local in dev, via GAS in production)
    const verifyOTPCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
        // In dev mode, verify locally
        if (isDevMode) {
            if (code === generatedOtp) {
                return { success: true };
            }
            return { success: false, error: 'Invalid OTP. Please check and try again.' };
        }
        
        // Production: Verify via GAS backend
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ 
                    action: 'verifyOTP', 
                    payload: { 
                        email: formData.universityEmail,
                        code
                    } 
                })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Verify OTP error:', error);
            return { success: false, error: 'Verification failed. Please try again.' };
        }
    };

    // Upload profile picture to GAS backend
    const uploadProfilePicture = async (dataUrl: string): Promise<{ success: boolean; url?: string; fileId?: string; error?: string }> => {
        // If in dev mode, return the data URL directly
        if (isDevMode) {
            await new Promise(r => setTimeout(r, 500));
            return { 
                success: true, 
                url: dataUrl,
                fileId: 'dev_' + Date.now()
            };
        }
        
        // Parse the data URL to extract base64 and mimeType
        // dataUrl format: "data:image/jpeg;base64,/9j/4AAQSkZJ..."
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return { success: false, error: 'Invalid image format' };
        }
        
        const mimeType = matches[1]; // e.g., "image/jpeg"
        const base64Data = matches[2]; // The actual base64 string without prefix
        const extension = mimeType.split('/')[1] || 'jpg';
        const filename = `profile_${formData.studentId}_${Date.now()}.${extension}`;
        
        // Call GAS backend for real file upload
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ 
                    action: 'uploadProfilePicture', 
                    payload: { 
                        data: base64Data,  // Base64 string WITHOUT "data:image/...;base64," prefix
                        mimeType: mimeType,
                        filename: filename
                    } 
                })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Upload error:', error);
            return { success: false, error: 'Failed to upload profile picture' };
        }
    };

    // Submit application using local dataService
    const submitApplicationData = async (avatarUrl?: string, avatarFileId?: string): Promise<{ success: boolean; application?: any; error?: string }> => {
        try {
            const { submitApplication, resubmitApplication } = await import('../services/dataService');
            
            const applicationData = {
                studentId: formData.studentId,
                universityEmail: formData.universityEmail,
                fullName: formData.fullName,
                username: formData.username,
                password: formData.password,
                contactNumber: formData.contactNumber,
                personalEmail: formData.personalEmail,
                avatar: avatarUrl || formData.avatar,
                avatarFileId: avatarFileId || formData.avatarFileId,
                socialLinks: formData.socialLinks, // Already in correct format { id, url, platform }[]
                province: formData.province,
                city: formData.city,
                barangay: formData.barangay,
                purokHouseNumber: formData.purokHouseNumber,
                school: formData.school,
                college: formData.college,
                program: formData.program,
                major: formData.major,
                yearLevel: formData.yearLevel,
                section: formData.section || '1SF',
                emergencyPerson: formData.emergencyPerson,
                emergencyContact: formData.emergencyContact
            };
            
            let application;
            
            if (isRetryMode && retryApp?.id) {
                // Resubmit existing rejected application
                application = resubmitApplication(retryApp.id, applicationData as any, attemptNumber);
                if (!application) {
                    return { success: false, error: 'Failed to resubmit application. It may no longer be available.' };
                }
            } else {
                // New application
                application = submitApplication(applicationData);
            }
            
            return { 
                success: true, 
                application: {
                    id: application.id,
                    studentId: formData.studentId,
                    fullName: formData.fullName,
                    status: 'pending',
                    isRetry: isRetryMode,
                    attemptNumber: isRetryMode ? attemptNumber : 1
                }
            };
        } catch (error) {
            console.error('Submit error:', error);
            return { success: false, error: 'Failed to submit application' };
        }
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handle OTP input
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otpCode];
        newOtp[index] = value.slice(-1);
        setOtpCode(newOtp);
        
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otpCode];
        for (let i = 0; i < pasted.length; i++) {
            newOtp[i] = pasted[i];
        }
        setOtpCode(newOtp);
        if (pasted.length === 6) {
            otpRefs.current[5]?.focus();
        }
    };

    // Handle Step 1 submission
    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFieldErrors({});
        
        try {
            const idPattern = /^\d{4}-\d{5}$/;
            if (!idPattern.test(formData.studentId)) {
                setFieldErrors({ studentId: 'Invalid format. Use YYYY-NNNNN (e.g., 2025-00046)' });
                setIsLoading(false);
                return;
            }
            
            if (!formData.universityEmail.endsWith('.edu') && !formData.universityEmail.endsWith('.edu.ph')) {
                setFieldErrors({ universityEmail: 'Must be a valid .edu or .edu.ph email' });
                setIsLoading(false);
                return;
            }
            
            // Validate Student ID format
            const validateResult = validateStudentId(formData.studentId);
            if (!validateResult.success) {
                setFieldErrors({ studentId: validateResult.error || 'Invalid Student ID' });
                setIsLoading(false);
                return;
            }
            
            // Validate email format
            const emailValidation = validateEmailFormat(formData.universityEmail);
            if (!emailValidation.success) {
                setFieldErrors({ universityEmail: emailValidation.error || 'Invalid email format' });
                setIsLoading(false);
                return;
            }

            // --- NEW: Check for duplicates (Users & Applications) ---
            const { getUsers, checkExistingApplication } = await import('../services/dataService');
            const users = getUsers();

            // 1. Check if Student ID is already registered
            const existingUserById = users.find(u => u.studentId === formData.studentId);
            if (existingUserById) {
                setFieldErrors({ studentId: 'This Student ID is already registered.' });
                showToast('Account already exists for this Student ID', 'error');
                setIsLoading(false);
                return;
            }

            // 2. Check if Email is already registered
            const existingUserByEmail = users.find(u => u.email === formData.universityEmail);
            if (existingUserByEmail) {
                setFieldErrors({ universityEmail: 'This email is already registered.' });
                showToast('Account already exists for this email', 'error');
                setIsLoading(false);
                return;
            }

            // 3. Check for pending applications
            const existingApp = checkExistingApplication(formData.studentId, formData.universityEmail);
            if (existingApp) {
                const isIdMatch = existingApp.studentId === formData.studentId;
                const msg = isIdMatch 
                    ? 'An application with this Student ID is already pending.' 
                    : 'An application with this email is already pending.';
                
                setFieldErrors(isIdMatch 
                    ? { studentId: msg }
                    : { universityEmail: msg }
                );
                showToast(msg, 'warning');
                setIsLoading(false);
                return;
            }
            // -------------------------------------------------------
            
            // Send OTP
            const otpResult = await sendOTPToEmail(formData.universityEmail);
            
            if (!otpResult.success) {
                setFieldErrors({ universityEmail: otpResult.error || 'Failed to send OTP' });
                setIsLoading(false);
                return;
            }
            
            if (otpResult.devOtp) {
                showToast(`[DEV MODE] Your OTP is: ${otpResult.devOtp}`, 'info');
            }
            
            showToast('Verification code sent to your email!', 'success');
            setOtpTimer(60); // Start 60s timer
            setCurrentStep(2);
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (otpTimer > 0) return;
        
        setIsLoading(true);
        try {
            const otpResult = await sendOTPToEmail(formData.universityEmail);
            if (otpResult.success) {
                showToast('New verification code sent!', 'success');
                setOtpTimer(60);
                if (otpResult.devOtp) {
                    showToast(`[DEV MODE] Your OTP is: ${otpResult.devOtp}`, 'info');
                }
            } else {
                showToast(otpResult.error || 'Failed to resend OTP', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Step 2 verification
    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const code = otpCode.join('');
        if (code.length !== 6) {
            showToast('Please enter the complete 6-digit code', 'error');
            setIsLoading(false);
            return;
        }
        
        try {
            // Verify OTP (async - uses GAS backend in production)
            const result = await verifyOTPCode(code);
            
            if (!result.success) {
                showToast(result.error || 'Invalid verification code', 'error');
                setIsLoading(false);
                return;
            }
            
            showToast('Email verified successfully!', 'success');
            setCurrentStep(3);
        } catch (err) {
            showToast('Verification failed. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle avatar upload
    const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            showToast('Please select a JPG or PNG file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, avatarPreview: reader.result as string }));
            showToast('Photo selected successfully', 'success');
        };
        reader.readAsDataURL(file);
    };

    // Upload avatar to Drive (uses GAS backend)
    const uploadAvatar = async (): Promise<{ url: string; fileId: string } | null> => {
        if (!formData.avatarPreview) return null;
        
        try {
            const result = await uploadProfilePicture(formData.avatarPreview);
            
            if (result.success && result.url) {
                return { url: result.url, fileId: result.fileId || '' };
            }
            return null;
        } catch (err) {
            console.error('Avatar upload error:', err);
            return null;
        }
    };

    // Add social link
    const addSocialLink = () => {
        if (!newSocialLink.trim()) return;
        
        let url = newSocialLink.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        const platform = detectPlatform(url);
        
        setFormData(prev => ({
            ...prev,
            socialLinks: [...prev.socialLinks, {
                id: Date.now().toString(),
                url,
                platform: platform.key
            }]
        }));
        setNewSocialLink('');
        showToast('Social link added', 'success');
    };

    // Remove social link
    const removeSocialLink = (id: string) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: prev.socialLinks.filter(link => link.id !== id)
        }));
    };

    // Validate Step 3
    const validateStep3 = async (): Promise<boolean> => {
        const errors: Record<string, string> = {};
        
        if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
        if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact number is required';
        if (!formData.avatarPreview) errors.avatar = 'Formal picture is required';
        if (!formData.province.trim()) errors.province = 'Province is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.barangay.trim()) errors.barangay = 'Barangay is required';
        if (!formData.school.trim()) errors.school = 'School is required';
        if (!formData.college.trim()) errors.college = 'College is required';
        if (!formData.program.trim()) errors.program = 'Program is required';
        if (!formData.yearLevel) errors.yearLevel = 'Year level is required';
        if (!formData.emergencyPerson.trim()) errors.emergencyPerson = 'Emergency contact person is required';
        if (!formData.emergencyContact.trim()) errors.emergencyContact = 'Emergency contact number is required';
        if (!formData.username.trim()) errors.username = 'Username is required';
        if (formData.username.length < 4) errors.username = 'Username must be at least 4 characters';
        if (!formData.password) errors.password = 'Password is required';
        if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
        
        // Check for duplicates
        const duplicateResults = await validateDuplicates();
        for (const result of duplicateResults) {
            if (!result.isValid) {
                errors[result.field] = result.message;
            }
        }
        
        setFieldErrors(errors);
        
        if (Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0];
            showToast(firstError, 'error');
            return false;
        }
        
        return true;
    };

    // Handle final submission with progress
    const handleFinalSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const isValid = await validateStep3();
        if (!isValid) return;
        
        const steps: ProgressStep[] = [
            { id: 'validate', label: 'Validating information', status: 'pending' },
            { id: 'upload', label: 'Uploading profile picture', status: 'pending' },
            { id: 'submit', label: 'Submitting application', status: 'pending' },
            { id: 'cloud', label: 'Linking to Cloud (Firebase)', status: 'pending' },
            { id: 'confirm', label: 'Confirming submission', status: 'pending' }
        ];
        
        setProgressSteps(steps);
        setShowProgressToast(true);
        
        const updateStep = (id: string, status: ProgressStep['status'], errorCode?: string, errorMessage?: string) => {
            setProgressSteps(prev => prev.map(s => 
                s.id === id ? { ...s, status, errorCode, errorMessage } : s
            ));
        };
        
        try {
            // Step 1: Validate
            updateStep('validate', 'loading');
            await new Promise(r => setTimeout(r, 500));
            updateStep('validate', 'success');
            
            // Step 2: Upload avatar
            updateStep('upload', 'loading');
            let avatarData = { url: '', fileId: '' };
            
            if (formData.avatarPreview) {
                const uploadResult = await uploadAvatar();
                if (uploadResult) {
                    avatarData = uploadResult;
                } else {
                    updateStep('upload', 'error', 'ERR_UPLOAD_001', 'Failed to upload profile picture');
                    return;
                }
            }
            updateStep('upload', 'success');
            
            // Step 3: Submit application using local dataService
            updateStep('submit', 'loading');
            
            // Pass avatar data directly to avoid React async state issue
            const result = await submitApplicationData(avatarData.url, avatarData.fileId);
            
            if (!result.success) {
                updateStep('submit', 'error', 'ERR_SUBMIT_001', result.error || 'Failed to submit');
                return;
            }
            updateStep('submit', 'success');

            // Step 3.5: Verify it reached Firebase (best-effort)
            updateStep('cloud', 'loading');
            try {
                const { dbRefs, dbHelpers } = await import('../services/firebase');
                const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
                let verified = false;
                for (let i = 0; i < 10; i++) { // up to ~5s
                    const fbItem = await dbHelpers.getOne<any>(dbRefs.application(result.application.id));
                    if (fbItem) { verified = true; break; }
                    await wait(500);
                }
                if (verified) {
                    updateStep('cloud', 'success');
                } else {
                    // Do not fail the whole flow; mark success with note
                    setProgressSteps(prev => prev.map(s => 
                        s.id === 'cloud' ? { ...s, status: 'success', label: 'Cloud sync pending (will appear shortly)' } : s
                    ));
                }
            } catch (cloudErr) {
                // Non-blocking; show as success but annotate
                setProgressSteps(prev => prev.map(s => 
                    s.id === 'cloud' ? { ...s, status: 'success', label: 'Cloud check skipped (offline or restricted)' } : s
                ));
            }
            
            // Step 4: Confirm
            updateStep('confirm', 'loading');
            await new Promise(r => setTimeout(r, 500));
            updateStep('confirm', 'success');
            
            // Success - wait then complete
            await new Promise(r => setTimeout(r, 1500));
            onComplete({ 
                ...result.application, 
                isApplication: true,
                message: 'Your application has been submitted and is pending admin approval.'
            });
            
        } catch (err) {
            console.error('Application submission error:', err);
            const loadingStep = progressSteps.find(s => s.status === 'loading');
            if (loadingStep) {
                updateStep(loadingStep.id, 'error', 'ERR_NETWORK_001', 'Network error occurred');
            }
        }
    };

    // Render Step 1
    const renderStep1 = () => (
        <form onSubmit={handleStep1Submit} className="space-y-6">
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4">
                    <UserCircle size={20} className="text-amber-600" /> Student Verification
                </h3>
                
                <div className="space-y-4">
                    <InputField
                        label="Student ID Number"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleChange}
                        placeholder="2025-00046"
                        pattern="\d{4}-\d{5}"
                        required
                        icon={<User size={18} />}
                        error={fieldErrors.studentId}
                        hint="Format: YYYY-NNNNN (e.g., 2025-00046)"
                    />
                    
                    <InputField
                        label="University Email"
                        name="universityEmail"
                        type="email"
                        value={formData.universityEmail}
                        onChange={handleChange}
                        placeholder="student@university.edu.ph"
                        required
                        icon={<Mail size={18} />}
                        error={fieldErrors.universityEmail}
                        hint="Must be a valid .edu or .edu.ph email"
                    />
                </div>
            </div>
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#4a3728] hover:bg-[#3E2723] disabled:bg-stone-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Sending...</>
                ) : (
                    <>Send Verification Code <ChevronRight size={20} /></>
                )}
            </button>
        </form>
    );

    // Render Step 2
    const renderStep2 = () => (
        <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                    <p className="text-amber-800 dark:text-amber-300 text-sm">
                        Please check your email <strong className="font-semibold">{formData.universityEmail}</strong> for a 6-digit verification code.
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3 text-center">
                        Enter Verification Code
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                        {otpCode.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => { otpRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleOtpChange(index, e.target.value)}
                                onKeyDown={e => handleOtpKeyDown(index, e)}
                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-stone-300 dark:border-stone-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-700 dark:text-white"
                            />
                        ))}
                    </div>
                    
                    <div className="text-center mt-4">
                        {otpTimer > 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                Resend code in <span className="font-bold text-amber-600">{otpTimer}s</span>
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={isLoading}
                                className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-50"
                            >
                                Resend Verification Code
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <button
                type="submit"
                disabled={isLoading || otpCode.join('').length !== 6}
                className="w-full bg-[#4a3728] hover:bg-[#3E2723] disabled:bg-stone-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Verifying...</>
                ) : (
                    <>Verify Code <Check size={20} /></>
                )}
            </button>
            
            <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full text-stone-500 dark:text-stone-400 text-sm hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
            >
                <ChevronLeft size={16} /> Back to Step 1
            </button>
        </form>
    );

    // Render Step 3 sections
    const renderStep3 = () => (
        <form onSubmit={handleFinalSubmit} className="space-y-6">
            {/* Personal Information Card */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <UserCircle size={20} className="text-amber-600" /> Personal Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <InputField
                            label="Full Name"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                            icon={<User size={18} />}
                            error={fieldErrors.fullName}
                        />
                    </div>
                    
                    <InputField
                        label="Contact Number"
                        name="contactNumber"
                        type="tel"
                        value={formData.contactNumber}
                        onChange={handleChange}
                        placeholder="09XX XXX XXXX"
                        required
                        icon={<Phone size={18} />}
                        error={fieldErrors.contactNumber}
                    />
                    
                    <InputField
                        label="Personal Email"
                        name="personalEmail"
                        type="email"
                        value={formData.personalEmail}
                        onChange={handleChange}
                        placeholder="personal@gmail.com"
                        icon={<Mail size={18} />}
                        error={fieldErrors.personalEmail}
                    />
                </div>
                
                {/* Avatar Upload */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                        Formal Picture <span className="text-red-500">*</span> <span className="text-stone-500 font-normal">(JPG/PNG)</span>
                    </label>
                    <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-700 flex-shrink-0 border-2 ${fieldErrors.avatar ? 'border-red-400' : 'border-dashed border-stone-300 dark:border-stone-600'}`}>
                            {formData.avatarPreview ? (
                                <img src={formData.avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400">
                                    <UserCircle size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={handleAvatarSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-lg transition-colors text-sm font-medium border-2 border-stone-300 dark:border-stone-600"
                            >
                                <Upload size={16} /> Select Photo
                            </button>
                            <p className="text-xs text-stone-500 mt-1">Max 5MB, JPG or PNG only</p>
                            {fieldErrors.avatar && <p className="text-xs text-red-500 mt-1">{fieldErrors.avatar}</p>}
                        </div>
                    </div>
                </div>
                
                {/* Social Links */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Social Links (Optional)</label>
                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="url"
                                value={newSocialLink}
                                onChange={e => setNewSocialLink(e.target.value)}
                                placeholder="https://facebook.com/username"
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-500 outline-none transition-all bg-white dark:bg-stone-800 dark:text-white text-sm"
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSocialLink())}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addSocialLink}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {formData.socialLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.socialLinks.map(link => {
                                const platform = SOCIAL_PLATFORMS[link.platform] || SOCIAL_PLATFORMS.default;
                                return (
                                    <div key={link.id} className="flex items-center gap-2 bg-stone-100 dark:bg-stone-700 px-3 py-1.5 rounded-full text-sm border border-stone-200 dark:border-stone-600">
                                        {platform.icon}
                                        <span className="text-stone-600 dark:text-stone-300 truncate max-w-[100px] sm:max-w-[150px]">{platform.name}</span>
                                        <button type="button" onClick={() => removeSocialLink(link.id)} className="text-stone-400 hover:text-red-500">
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Location Card */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <MapPin size={20} className="text-amber-600" /> Location
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                        label="Province"
                        name="province"
                        value={formData.province}
                        onChange={handleChange}
                        required
                        icon={<MapPin size={18} />}
                        error={fieldErrors.province}
                    />
                    <InputField
                        label="City/Municipality"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        icon={<Building size={18} />}
                        error={fieldErrors.city}
                    />
                    <InputField
                        label="Barangay"
                        name="barangay"
                        value={formData.barangay}
                        onChange={handleChange}
                        required
                        error={fieldErrors.barangay}
                    />
                    <InputField
                        label="Purok/House Number"
                        name="purokHouseNumber"
                        value={formData.purokHouseNumber}
                        onChange={handleChange}
                        placeholder="Purok 1, #123"
                    />
                </div>
            </div>
            
            {/* School Info Card - Cascading Dropdowns */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <GraduationCap size={20} className="text-amber-600" /> School Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* School Selection */}
                    <div className="sm:col-span-2">
                        <AutocompleteField
                            label="School/University"
                            value={formData.schoolId}
                            displayValue={formData.school}
                            options={schoolStructure.schools.map(s => ({ id: s.id, name: s.name }))}
                            onChange={handleSchoolSelect}
                            required
                            icon={<School size={18} />}
                            error={fieldErrors.school}
                            placeholder="Search or select school..."
                            allowCustom
                        />
                    </div>
                    
                    {/* Department Selection (if school selected and has departments) */}
                    {formData.schoolId && filteredDepartments.length > 0 && (
                        <div className="sm:col-span-2">
                            <AutocompleteField
                                label="Department Type"
                                value={formData.departmentId}
                                displayValue={selectedDepartment?.name || ''}
                                options={filteredDepartments.map(d => ({ 
                                    id: d.id, 
                                    name: `${d.name} (${d.type === 'TERTIARY' ? 'College/University' : d.type === 'SENIOR_HIGH' ? 'Senior High' : 'Junior High'})`
                                }))}
                                onChange={handleDepartmentSelect}
                                required
                                placeholder="Select department..."
                            />
                        </div>
                    )}
                    
                    {/* TERTIARY PATH: College → Program → Major → Year → Section */}
                    {departmentType === 'TERTIARY' && (
                        <>
                            <AutocompleteField
                                label="College"
                                value={formData.collegeId}
                                displayValue={formData.college}
                                options={filteredColleges.map(c => ({ id: c.id, name: c.name }))}
                                onChange={handleCollegeSelect}
                                required
                                icon={<Building size={18} />}
                                error={fieldErrors.college}
                                placeholder="Select college..."
                                disabled={!formData.departmentId}
                                allowCustom
                            />
                            <AutocompleteField
                                label="Program"
                                value={formData.programId}
                                displayValue={formData.program}
                                options={filteredPrograms.map(p => ({ id: p.id, name: p.name }))}
                                onChange={handleProgramSelect}
                                required
                                placeholder="Select program..."
                                disabled={!formData.collegeId}
                                error={fieldErrors.program}
                                allowCustom
                            />
                            {filteredMajors.length > 0 && (
                                <AutocompleteField
                                    label="Major (Optional)"
                                    value={formData.majorId}
                                    displayValue={formData.major}
                                    options={filteredMajors.map(m => ({ id: m.id, name: m.name }))}
                                    onChange={handleMajorSelect}
                                    placeholder="Select major..."
                                    disabled={!formData.programId}
                                    allowCustom
                                />
                            )}
                            <AutocompleteField
                                label="Year Level"
                                value={formData.yearLevelId}
                                displayValue={formData.yearLevel}
                                options={filteredYearLevels.map(y => ({ id: y.id, name: y.name }))}
                                onChange={handleYearLevelSelect}
                                required
                                icon={<GraduationCap size={18} />}
                                placeholder="Select year level..."
                                disabled={!formData.programId}
                                error={fieldErrors.yearLevel}
                                allowCustom
                            />
                            <AutocompleteField
                                label="Section"
                                value={formData.sectionId}
                                displayValue={formData.section}
                                options={filteredSections.map(s => ({ id: s.id, name: s.name }))}
                                onChange={handleSectionSelect}
                                placeholder="Select section..."
                                disabled={!formData.yearLevelId}
                                allowCustom
                            />
                        </>
                    )}
                    
                    {/* SENIOR HIGH PATH: Track → Strand → Grade Level → Section */}
                    {departmentType === 'SENIOR_HIGH' && (
                        <>
                            <AutocompleteField
                                label="Track"
                                value={formData.trackId}
                                displayValue={schoolStructure.tracks.find(t => t.id === formData.trackId)?.name || ''}
                                options={filteredTracks.map(t => ({ id: t.id, name: t.name }))}
                                onChange={handleTrackSelect}
                                required
                                placeholder="Select track..."
                                disabled={!formData.departmentId}
                            />
                            <AutocompleteField
                                label="Strand"
                                value={formData.strandId}
                                displayValue={schoolStructure.strands.find(s => s.id === formData.strandId)?.name || ''}
                                options={filteredStrands.map(s => ({ id: s.id, name: s.name }))}
                                onChange={handleStrandSelect}
                                required
                                placeholder="Select strand..."
                                disabled={!formData.trackId}
                            />
                            <AutocompleteField
                                label="Grade Level"
                                value={formData.yearLevelId}
                                displayValue={formData.yearLevel}
                                options={filteredYearLevels.map(y => ({ id: y.id, name: y.name }))}
                                onChange={handleYearLevelSelect}
                                required
                                icon={<GraduationCap size={18} />}
                                placeholder="Select grade level..."
                                disabled={!formData.strandId}
                                error={fieldErrors.yearLevel}
                            />
                            <AutocompleteField
                                label="Section"
                                value={formData.sectionId}
                                displayValue={formData.section}
                                options={filteredSections.map(s => ({ id: s.id, name: s.name }))}
                                onChange={handleSectionSelect}
                                placeholder="Select section..."
                                disabled={!formData.yearLevelId}
                            />
                        </>
                    )}
                    
                    {/* JUNIOR HIGH PATH: Grade Level → Section */}
                    {departmentType === 'JUNIOR_HIGH' && (
                        <>
                            <AutocompleteField
                                label="Grade Level"
                                value={formData.yearLevelId}
                                displayValue={formData.yearLevel}
                                options={filteredYearLevels.map(y => ({ id: y.id, name: y.name }))}
                                onChange={handleYearLevelSelect}
                                required
                                icon={<GraduationCap size={18} />}
                                placeholder="Select grade level..."
                                disabled={!formData.departmentId}
                                error={fieldErrors.yearLevel}
                            />
                            <AutocompleteField
                                label="Section"
                                value={formData.sectionId}
                                displayValue={formData.section}
                                options={filteredSections.map(s => ({ id: s.id, name: s.name }))}
                                onChange={handleSectionSelect}
                                placeholder="Select section..."
                                disabled={!formData.yearLevelId}
                            />
                        </>
                    )}
                    
                    {/* Fallback for when no school structure exists - allow manual entry */}
                    {(!formData.schoolId || (formData.schoolId && filteredDepartments.length === 0)) && (
                        <>
                            {!formData.schoolId && (
                                <p className="sm:col-span-2 text-xs text-stone-500 dark:text-stone-400 italic">
                                    Type a school name above or select from suggestions if available.
                                </p>
                            )}
                            {formData.school && !formData.schoolId && (
                                <>
                                    <InputField
                                        label="College"
                                        name="college"
                                        value={formData.college}
                                        onChange={handleChange}
                                        required
                                        icon={<Building size={18} />}
                                        error={fieldErrors.college}
                                    />
                                    <InputField
                                        label="Program"
                                        name="program"
                                        value={formData.program}
                                        onChange={handleChange}
                                        placeholder="BS Computer Science"
                                        required
                                        error={fieldErrors.program}
                                    />
                                    <InputField
                                        label="Major (Optional)"
                                        name="major"
                                        value={formData.major}
                                        onChange={handleChange}
                                    />
                                    <SelectField
                                        label="Year Level"
                                        name="yearLevel"
                                        value={formData.yearLevel}
                                        onChange={handleChange}
                                        required
                                        icon={<GraduationCap size={18} />}
                                        options={[
                                            { value: '1st Year', label: '1st Year' },
                                            { value: '2nd Year', label: '2nd Year' },
                                            { value: '3rd Year', label: '3rd Year' },
                                            { value: '4th Year', label: '4th Year' },
                                            { value: '5th Year', label: '5th Year' },
                                            { value: 'Grade 7', label: 'Grade 7' },
                                            { value: 'Grade 8', label: 'Grade 8' },
                                            { value: 'Grade 9', label: 'Grade 9' },
                                            { value: 'Grade 10', label: 'Grade 10' },
                                            { value: 'Grade 11', label: 'Grade 11' },
                                            { value: 'Grade 12', label: 'Grade 12' },
                                        ]}
                                        error={fieldErrors.yearLevel}
                                    />
                                    <InputField
                                        label="Section"
                                        name="section"
                                        value={formData.section}
                                        onChange={handleChange}
                                        placeholder="Section name"
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Emergency Contact Card */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <Heart size={20} className="text-red-500" /> Emergency Contact
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                        label="Contact Person"
                        name="emergencyPerson"
                        value={formData.emergencyPerson}
                        onChange={handleChange}
                        placeholder="Parent/Guardian Name"
                        required
                        icon={<User size={18} />}
                        error={fieldErrors.emergencyPerson}
                    />
                    <InputField
                        label="Contact Number"
                        name="emergencyContact"
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={handleChange}
                        placeholder="09XX XXX XXXX"
                        required
                        icon={<Phone size={18} />}
                        error={fieldErrors.emergencyContact}
                    />
                </div>
            </div>
            
            {/* Security Card */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <Lock size={20} className="text-amber-600" /> Security
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                    <InputField
                        label="Username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Choose a username"
                        minLength={4}
                        required
                        icon={<User size={18} />}
                        error={fieldErrors.username}
                        hint="At least 4 characters"
                    />
                    <InputField
                        label="Password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 6 characters"
                        minLength={6}
                        required
                        icon={<Lock size={18} />}
                        error={fieldErrors.password}
                        hint="At least 6 characters"
                        rightElement={
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-stone-400 hover:text-stone-600">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        }
                    />
                    <InputField
                        label="Confirm Password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        required
                        icon={<Lock size={18} />}
                        error={fieldErrors.confirmPassword}
                        rightElement={
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-stone-400 hover:text-stone-600">
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        }
                    />
                    {formData.confirmPassword && formData.password && formData.password === formData.confirmPassword && (
                        <p className="text-green-500 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Passwords match</p>
                    )}
                </div>
            </div>
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#4a3728] hover:bg-[#3E2723] disabled:bg-stone-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Processing...</>
                ) : (
                    <>Submit Application <Check size={20} /></>
                )}
            </button>
            
            <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full text-stone-500 dark:text-stone-400 text-sm hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
            >
                <ChevronLeft size={16} /> Back to Step 2
            </button>
        </form>
    );

    // Field labels for display
    const CORRECTION_FIELD_LABELS: Record<string, string> = {
        studentId: 'Student ID',
        universityEmail: 'University Email',
        fullName: 'Full Name',
        username: 'Username',
        contactNumber: 'Contact Number',
        personalEmail: 'Personal Email',
        avatar: 'Profile Photo',
        province: 'Province',
        city: 'City/Municipality',
        barangay: 'Barangay',
        purokHouseNumber: 'Purok/House Number',
        school: 'School/University',
        college: 'College',
        program: 'Program',
        major: 'Major',
        yearLevel: 'Year Level',
        section: 'Section',
        emergencyPerson: 'Emergency Contact Person',
        emergencyContact: 'Emergency Contact Number'
    };

    // Handle correction submission
    const handleCorrectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const { resubmitApplication } = await import('../services/dataService');
            
            // Build the updated data
            const updatedData: any = {};
            fieldsToCorrect.forEach(({ field }) => {
                updatedData[field] = (formData as any)[field];
            });
            
            // Resubmit with corrections
            const result = resubmitApplication(retryApp.id, {
                ...retryApp,
                ...updatedData
            }, attemptNumber);
            
            if (result) {
                showToast('Your corrections have been submitted!', 'success');
                // Navigate back to landing page
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 1500);
            } else {
                showToast('Failed to submit corrections. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Correction submit error:', error);
            showToast('An error occurred. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Render correction-only mode (Step 4)
    const renderCorrectionMode = () => (
        <form onSubmit={handleCorrectionSubmit} className="space-y-6">
            {/* Header Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <RotateCcw size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-800 dark:text-amber-300">Correct Your Application</h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            Please update the {fieldsToCorrect.length} field(s) below that need correction
                        </p>
                        <p className="text-xs text-amber-500 dark:text-amber-500 mt-1">
                            Attempt {attemptNumber} • Student ID: {retryApp?.studentId}
                        </p>
                    </div>
                </div>
            </div>

            {/* Fields to Correct */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <AlertCircle size={20} className="text-red-500" /> Fields Requiring Correction
                </h3>
                
                <div className="space-y-4">
                    {fieldsToCorrect.map(({ field, issue }) => (
                        <div key={field} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                            {/* Issue description */}
                            <div className="flex items-start gap-2 mb-3">
                                <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-red-700 dark:text-red-400">{CORRECTION_FIELD_LABELS[field] || field}</p>
                                    <p className="text-xs text-red-600 dark:text-red-400">Issue: {issue}</p>
                                </div>
                            </div>
                            
                            {/* Current value display */}
                            <div className="mb-2 text-xs text-stone-500 dark:text-stone-400">
                                Previous value: <span className="font-mono bg-stone-100 dark:bg-stone-700 px-1 rounded">{retryApp?.[field] || 'Not provided'}</span>
                            </div>
                            
                            {/* Input field based on field type */}
                            {field === 'avatar' ? (
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        value={formData.avatar}
                                        onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                                        placeholder="Enter new profile photo URL"
                                        className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-sm focus:border-amber-500 focus:outline-none"
                                    />
                                    {formData.avatar && (
                                        <div className="flex items-center gap-2">
                                            <img src={formData.avatar} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-amber-500" 
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                                            />
                                            <span className="text-xs text-green-600">Preview</span>
                                        </div>
                                    )}
                                </div>
                            ) : field === 'section' ? (
                                <select
                                    value={(formData as any)[field] || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-sm focus:border-amber-500 focus:outline-none"
                                >
                                    <option value="">Select Section</option>
                                    {['1SF', '2SF', '3SF', '4SF', '1SG', '2SG', '3SG', '4SG'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            ) : field === 'yearLevel' ? (
                                <select
                                    value={(formData as any)[field] || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-sm focus:border-amber-500 focus:outline-none"
                                >
                                    <option value="">Select Year Level</option>
                                    {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.includes('email') || field === 'universityEmail' ? 'email' : 
                                          field.includes('contact') || field === 'contactNumber' || field === 'emergencyContact' ? 'tel' : 'text'}
                                    value={(formData as any)[field] || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                                    placeholder={`Enter new ${CORRECTION_FIELD_LABELS[field] || field}`}
                                    className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-sm focus:border-amber-500 focus:outline-none"
                                    required
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-stone-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Submitting Corrections...</>
                ) : (
                    <>Submit Corrections <Check size={20} /></>
                )}
            </button>
            
            <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-stone-500 dark:text-stone-400 text-sm hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
            >
                <ChevronLeft size={16} /> Cancel
            </button>
        </form>
    );

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-900">
            {/* Header */}
            <div className="bg-[#3E2723] dark:bg-black sticky top-0 z-40 shadow-lg">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/')} 
                        className="text-white/80 hover:text-white flex items-center text-sm font-medium transition-colors"
                    >
                        <Home size={18} className="mr-2" /> Home
                    </button>
                    <div className="flex items-center gap-3">
                        <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full border-2 border-amber-600 object-cover bg-white" />
                        <div className="hidden sm:block">
                            <h1 className="text-white font-bold text-sm">{appName}</h1>
                            <p className="text-amber-300 text-xs">Student Registration</p>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel} 
                        className="text-white/80 hover:text-white flex items-center text-sm font-medium transition-colors"
                    >
                        <ArrowLeft size={18} className="mr-2" /> Login
                    </button>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
                {/* Step Indicator - Only show for normal registration, not correction mode */}
                {!isCorrectionMode ? (
                    <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 mb-6 shadow-sm">
                        {/* Retry Mode Banner */}
                        {isRetryMode && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <RotateCcw size={16} />
                                    <span className="font-bold text-sm">Resubmitting Application</span>
                                    <span className="ml-auto text-xs bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded">
                                        Attempt {attemptNumber}
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Your previous application was rejected. Please review and update your information.
                                </p>
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-stone-800 dark:text-white">
                                {isRetryMode ? 'Resubmit Application' : 'Registration'}
                            </h2>
                            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600">
                                Step {currentStep} of 3
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                            {[
                                { step: 1, label: 'Verification' },
                                { step: 2, label: 'OTP' },
                                { step: 3, label: 'Details' }
                            ].map(({ step, label }) => (
                                <div key={step} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                                            currentStep === step
                                                ? 'bg-amber-600 text-white scale-110 shadow-lg'
                                                : currentStep > step
                                                ? 'bg-green-500 text-white'
                                                : 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                                        }`}
                                    >
                                        {currentStep > step ? <Check size={18} /> : step}
                                    </div>
                                    <span className="text-xs mt-1 text-stone-500 dark:text-stone-400 hidden sm:block">{label}</span>
                                </div>
                                {step < 3 && (
                                    <div className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 rounded ${
                                        currentStep > step ? 'bg-green-500' : 'bg-stone-200 dark:bg-stone-700'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                ) : null}
                
                {/* Step Content */}
                <div className="animate-in">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && isCorrectionMode && renderCorrectionMode()}
                </div>
            </div>
            
            {/* Progress Toast */}
            {showProgressToast && (
                <ProgressToast 
                    steps={progressSteps}
                    onClose={() => setShowProgressToast(false)}
                    onRetry={() => handleFinalSubmit()}
                    isComplete={progressSteps.every(s => s.status === 'success')}
                />
            )}
        </div>
    );
};

export default Registration;
