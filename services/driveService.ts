/**
 * Google Drive Service
 * Handles file uploads to Google Drive via Google Apps Script
 * 
 * Flow:
 * 1. User selects a file in the frontend
 * 2. File is converted to base64
 * 3. Sent to GAS endpoint which uploads to Google Drive
 * 4. GAS returns the public view URL
 * 5. URL is stored in Firebase
 * 6. Image is displayed in the frontend
 */

import { dbRefs, dbHelpers } from './firebase';

// Google Apps Script Web App URL - Replace with your deployed GAS URL
// To get this URL:
// 1. Open your Google Apps Script project
// 2. Click Deploy > Manage deployments
// 3. Copy the Web App URL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// Folder IDs from Google Drive
const DRIVE_FOLDERS = {
    PROFILE_PICTURES: '12FPfu_L8-tSnmfe22ou6kwkUEhh0NwuB', // Profile Picture folder
    CLASS_SYNC: '1Rg7-dFZB7On1UTE9yr1jMYyiqlE53MpT',      // Main ClassSync folder
};

export interface UploadResult {
    success: boolean;
    url?: string;
    fileId?: string;
    error?: string;
}

/**
 * Uploads a file to Google Drive via GAS
 * @param file - The file to upload
 * @param folder - The target folder ('profile' | 'general')
 * @param customFilename - Optional custom filename
 */
export const uploadToDrive = async (
    file: File, 
    folder: 'profile' | 'general' = 'general',
    customFilename?: string
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onloadend = async () => {
            try {
                const base64Data = (reader.result as string).split(',')[1];
                const filename = customFilename || `${Date.now()}_${file.name}`;
                
                const payload = {
                    action: 'uploadProfilePicture',
                    payload: {
                        data: base64Data,
                        mimeType: file.type,
                        filename: filename,
                        folderId: folder === 'profile' ? DRIVE_FOLDERS.PROFILE_PICTURES : DRIVE_FOLDERS.CLASS_SYNC
                    }
                };

                // For development/testing - return local data URL
                // Comment this block and uncomment the fetch below for production
                if (GAS_WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID')) {
                    console.log('DEV MODE: Returning local data URL. Deploy GAS and update URL for production.');
                    resolve({
                        success: true,
                        url: reader.result as string,
                        fileId: 'local_' + Date.now()
                    });
                    return;
                }

                // Production: Send to GAS endpoint
                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain', // GAS prefers text/plain to avoid CORS preflight
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (result.success) {
                    resolve({
                        success: true,
                        url: result.url,
                        fileId: result.fileId
                    });
                } else {
                    resolve({
                        success: false,
                        error: result.error || 'Upload failed'
                    });
                }
            } catch (error) {
                console.error('Drive upload error:', error);
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
};

/**
 * Upload profile picture and update user record in Firebase
 * @param file - The image file
 * @param userId - The user's ID
 */
export const uploadProfilePicture = async (file: File, userId: string): Promise<string> => {
    // Generate unique filename with user ID
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `profile_${userId}_${Date.now()}.${ext}`;
    
    const result = await uploadToDrive(file, 'profile', filename);
    
    if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to upload profile picture');
    }

    // Update user's avatar in Firebase
    try {
        await dbHelpers.updateData(dbRefs.user(userId), { 
            avatar: result.url,
            avatarFileId: result.fileId 
        });
    } catch (e) {
        console.error('Failed to update Firebase with new avatar:', e);
        // Still return the URL even if Firebase update fails
    }

    return result.url;
};

/**
 * Upload image to album folder
 * @param file - The image file
 * @param caption - Image caption
 */
export const uploadAlbumImage = async (file: File, caption?: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `album_${Date.now()}.${ext}`;
    
    const result = await uploadToDrive(file, 'general', filename);
    
    if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to upload image');
    }

    return result.url;
};

/**
 * Get the direct view URL for a Google Drive file
 * @param fileId - Google Drive file ID
 */
export const getDriveViewUrl = (fileId: string): string => {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

/**
 * Get the thumbnail URL for a Google Drive file
 * @param fileId - Google Drive file ID
 * @param size - Thumbnail size (default: 200)
 */
export const getDriveThumbnailUrl = (fileId: string, size: number = 200): string => {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`;
};

export default {
    uploadToDrive,
    uploadProfilePicture,
    uploadAlbumImage,
    getDriveViewUrl,
    getDriveThumbnailUrl,
    DRIVE_FOLDERS
};
