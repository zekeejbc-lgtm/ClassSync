import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, School, Upload, Plus, X, Check, 
    Loader2, AlertCircle, Eye, EyeOff, ChevronRight, ChevronLeft,
    Globe, Github, Linkedin, Facebook, Instagram, Twitter, Link as LinkIcon,
    UserCircle, Building, GraduationCap, Heart, Lock, CheckCircle2,
    Home, ArrowLeft
} from 'lucide-react';
import { useToast } from './ui/Toast';

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
    const { showToast } = useToast();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [newSocialLink, setNewSocialLink] = useState('');
    const [showProgressToast, setShowProgressToast] = useState(false);
    const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState<RegistrationData>({
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
        school: '',
        college: '',
        program: '',
        major: '',
        yearLevel: '',
        section: '1SF',
        emergencyPerson: '',
        emergencyContact: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

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
            const { submitApplication } = await import('../services/dataService');
            
            const application = submitApplication({
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
            });
            
            return { 
                success: true, 
                application: {
                    id: application.id,
                    studentId: formData.studentId,
                    fullName: formData.fullName,
                    status: 'pending'
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
            setCurrentStep(2);
        } catch (err) {
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
            
            {/* School Info Card */}
            <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 sm:p-6 shadow-sm">
                <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-700">
                    <GraduationCap size={20} className="text-amber-600" /> School Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <InputField
                            label="School/University"
                            name="school"
                            value={formData.school}
                            onChange={handleChange}
                            required
                            icon={<School size={18} />}
                            error={fieldErrors.school}
                        />
                    </div>
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
                        label="Major"
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
                        ]}
                        error={fieldErrors.yearLevel}
                    />
                    <InputField
                        label="Section"
                        name="section"
                        value={formData.section}
                        onChange={handleChange}
                        placeholder="1SF"
                    />
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
                {/* Step Indicator */}
                <div className="bg-white dark:bg-stone-800 rounded-xl border-2 border-stone-200 dark:border-stone-700 p-4 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-stone-800 dark:text-white">Registration</h2>
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
                
                {/* Step Content */}
                <div className="animate-in">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
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
