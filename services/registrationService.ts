/**
 * Registration Service
 * Handles all registration-related API calls to the Google Apps Script backend
 */

// API endpoint - Your deployed GAS Web App URL
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzCWKJ8DnTaBeBdfxYg2F7kXdOwLkarDDL1zZuG6FL4lLUTpm7x-JIxiilMXOAsSBYm/exec';

// Check if we're in development mode
const isDevelopment = GAS_API_URL.includes('YOUR_DEPLOYMENT_ID');

/**
 * API Response types
 */
interface ApiResponse {
    success: boolean;
    error?: string;
    errorCode?: string;
    [key: string]: any;
}

interface ValidateStudentIdResponse extends ApiResponse {
    valid?: boolean;
    exists?: boolean;
}

interface SendOTPResponse extends ApiResponse {
    message?: string;
    devOtp?: string; // Only in dev mode
}

interface VerifyOTPResponse extends ApiResponse {
    verified?: boolean;
}

interface RegistrationResponse extends ApiResponse {
    user?: {
        id: string;
        idCode: string;
        studentId: string;
        username: string;
        fullName: string;
        email: string;
    };
}

interface UploadResponse extends ApiResponse {
    url?: string;
    fileId?: string;
}

/**
 * Make an API call to the GAS backend
 */
async function apiCall<T extends ApiResponse>(action: string, payload: any): Promise<T> {
    if (isDevelopment) {
        console.log('[DEV MODE] API Call:', action, payload);
        return simulateApiCall<T>(action, payload);
    }

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', // GAS requires text/plain for CORS
            },
            body: JSON.stringify({
                action,
                payload
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        console.error('API call error:', error);
        return {
            success: false,
            error: 'Network error. Please check your connection.',
            errorCode: 'ERR_NETWORK_001'
        } as T;
    }
}

/**
 * Development mode API simulation
 */
let devOtpCode = '';

async function simulateApiCall<T extends ApiResponse>(action: string, payload: any): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

    switch (action) {
        case 'validateStudentId': {
            const studentId = payload.studentId;
            const idPattern = /^\d{4}-\d{5}$/;
            
            if (!idPattern.test(studentId)) {
                return {
                    success: false,
                    error: 'Invalid Student ID format. Use YYYY-NNNNN (e.g., 2025-00046)',
                    errorCode: 'ERR_REG_001'
                } as T;
            }

            // Simulate checking if ID already exists (empty - no demo data)
            // In production, this check is done via GAS backend
            return {
                success: true,
                valid: true,
                exists: false
            } as unknown as T;
        }

        case 'sendOTP': {
            const email = payload.email;
            
            // Validate .edu email
            if (!email.endsWith('.edu') && !email.endsWith('.edu.ph')) {
                return {
                    success: false,
                    error: 'Please use a valid university email (.edu or .edu.ph)',
                    errorCode: 'ERR_OTP_001'
                } as T;
            }

            // Generate OTP for dev mode
            devOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            console.log(`[DEV MODE] Generated OTP: ${devOtpCode}`);

            return {
                success: true,
                message: 'Verification code sent to your email',
                devOtp: devOtpCode
            } as unknown as T;
        }

        case 'verifyOTP': {
            const code = payload.code;
            
            if (code === devOtpCode) {
                return {
                    success: true,
                    verified: true
                } as unknown as T;
            }

            return {
                success: false,
                error: 'Invalid or expired verification code',
                errorCode: 'ERR_VERIFY_001'
            } as T;
        }

        case 'uploadProfilePicture': {
            // Simulate upload
            const fakeFileId = 'dev_' + Date.now();
            
            return {
                success: true,
                url: payload.dataUrl || 'https://via.placeholder.com/200',
                fileId: fakeFileId
            } as unknown as T;
        }

        case 'completeRegistration': {
            const { studentId, username, fullName, universityEmail, section } = payload;
            
            // Check required fields
            if (!studentId || !username || !fullName || !universityEmail) {
                return {
                    success: false,
                    error: 'Missing required fields',
                    errorCode: 'ERR_REG_003'
                } as T;
            }

            // Generate ID code
            const sectionCode = section || '1SF';
            const idCode = `${sectionCode}-${studentId}`;

            return {
                success: true,
                user: {
                    id: 'user_' + Date.now(),
                    idCode,
                    studentId,
                    username,
                    fullName,
                    email: universityEmail
                }
            } as unknown as T;
        }

        default:
            return {
                success: false,
                error: 'Unknown action',
                errorCode: 'ERR_UNKNOWN'
            } as T;
    }
}

/**
 * Validate student ID format and availability
 */
export async function validateStudentId(studentId: string): Promise<ValidateStudentIdResponse> {
    return apiCall<ValidateStudentIdResponse>('validateStudentId', { studentId });
}

/**
 * Send OTP verification code to email
 */
export async function sendOTP(
    email: string, 
    studentId: string, 
    type: 'registration' | 'recovery' = 'registration'
): Promise<SendOTPResponse> {
    return apiCall<SendOTPResponse>('sendOTP', { email, studentId, type });
}

/**
 * Verify OTP code
 */
export async function verifyOTP(email: string, code: string): Promise<VerifyOTPResponse> {
    return apiCall<VerifyOTPResponse>('verifyOTP', { email, code });
}

/**
 * Upload profile picture to Google Drive
 */
export async function uploadProfilePicture(
    base64Data: string,
    mimeType: string,
    filename: string,
    dataUrl?: string
): Promise<UploadResponse> {
    return apiCall<UploadResponse>('uploadProfilePicture', {
        data: base64Data,
        mimeType,
        filename,
        dataUrl // For dev mode
    });
}

/**
 * Complete registration with all user data
 */
export interface RegistrationData {
    studentId: string;
    universityEmail: string;
    fullName: string;
    username: string;
    password: string;
    contactNumber?: string;
    personalEmail?: string;
    avatar?: string;
    avatarFileId?: string;
    socialLinks?: { id: string; url: string; platform: string }[];
    province?: string;
    city?: string;
    barangay?: string;
    purokHouseNumber?: string;
    school?: string;
    college?: string;
    program?: string;
    major?: string;
    yearLevel?: string;
    section?: string;
    emergencyPerson?: string;
    emergencyContact?: string;
}

export async function completeRegistration(data: RegistrationData): Promise<RegistrationResponse> {
    return apiCall<RegistrationResponse>('completeRegistration', data);
}

/**
 * Error code descriptions for debugging
 */
export const ERROR_CODES: Record<string, string> = {
    'ERR_REG_001': 'Invalid Student ID format',
    'ERR_REG_002': 'Student ID already registered',
    'ERR_REG_003': 'Missing required registration fields',
    'ERR_REG_004': 'Username already taken',
    'ERR_OTP_001': 'Invalid email format',
    'ERR_OTP_002': 'Failed to send OTP email',
    'ERR_OTP_003': 'Too many OTP requests',
    'ERR_VERIFY_001': 'Invalid or expired OTP code',
    'ERR_UPLOAD_001': 'Failed to upload profile picture',
    'ERR_NETWORK_001': 'Network connection error',
    'ERR_UNKNOWN': 'Unknown error occurred'
};

/**
 * Get human-readable error message from error code
 */
export function getErrorMessage(errorCode: string): string {
    return ERROR_CODES[errorCode] || 'An unexpected error occurred';
}
