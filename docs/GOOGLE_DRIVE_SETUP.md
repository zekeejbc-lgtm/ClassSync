# Google Drive Upload Setup Guide

This guide explains how to set up the Google Drive upload functionality for profile pictures and other media in ClassSync.

## Overview

The upload mechanism works as follows:

1. **User uploads a picture** in the frontend (Profile page)
2. **Frontend converts to base64** and sends to Google Apps Script
3. **GAS uploads to Google Drive** (Profile Pictures folder)
4. **GAS returns the public view URL**
5. **URL is stored in Firebase** (user record)
6. **Image is displayed** in the frontend using the Drive URL

## Prerequisites

- Google Account with access to:
  - Google Apps Script
  - Google Drive
  - The ClassSync Google Sheet
- Firebase project (already configured)

## Setup Steps

### 1. Google Drive Folders

The following folders are already set up:

- **ClassSync Main Folder**: `1Rg7-dFZB7On1UTE9yr1jMYyiqlE53MpT`
  - URL: https://drive.google.com/drive/folders/1Rg7-dFZB7On1UTE9yr1jMYyiqlE53MpT

- **Profile Pictures Folder**: `12FPfu_L8-tSnmfe22ou6kwkUEhh0NwuB`
  - URL: https://drive.google.com/drive/folders/12FPfu_L8-tSnmfe22ou6kwkUEhh0NwuB

Make sure these folders have sharing set to "Anyone with the link can view".

### 2. Google Apps Script Setup

1. Open Google Apps Script: https://script.google.com/

2. Create a new project or open your existing ClassSync project

3. Copy the contents of `backend/SF_Backend.js` to your `Code.gs` file

4. The key functions for file upload are:
   - `uploadProfilePicture(payload)` - Uploads to Profile Pictures folder
   - `uploadToFolder(payload)` - Uploads to any specified folder
   - `uploadFile(payload)` - Legacy upload function

### 3. Deploy the GAS Web App

1. In Google Apps Script, click **Deploy** > **New deployment**

2. Select type: **Web app**

3. Configure:
   - Description: "ClassSync API v1"
   - Execute as: **Me** (your account)
   - Who has access: **Anyone** (for public access)

4. Click **Deploy**

5. Copy the **Web app URL** (looks like: `https://script.google.com/macros/s/XXXXX/exec`)

### 4. Update Frontend Configuration

1. Open `services/driveService.ts`

2. Replace the placeholder URL with your deployed GAS URL:

```typescript
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### 5. Test the Upload

1. Start the development server: `npm run dev`

2. Log in as any user

3. Go to Profile page

4. Click "Upload to Google Drive" button

5. Select an image file

6. The image should:
   - Upload to Google Drive (Profile Pictures folder)
   - Display in the profile immediately
   - Be saved to Firebase

## File Structure

```
services/
├── driveService.ts      # Google Drive upload service
├── dataService.ts       # Updated with uploadProfilePicture
└── firebase.ts          # Firebase configuration

backend/
└── SF_Backend.js        # Google Apps Script code
```

## API Endpoints

### Upload Profile Picture
```json
POST {GAS_URL}
{
  "action": "uploadProfilePicture",
  "payload": {
    "data": "base64EncodedImageData",
    "mimeType": "image/jpeg",
    "filename": "profile_USER123_1234567890.jpg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://drive.google.com/uc?export=view&id=FILE_ID",
  "fileId": "1abc123...",
  "thumbnailUrl": "https://drive.google.com/thumbnail?id=FILE_ID&sz=s200"
}
```

### Upload to Custom Folder
```json
POST {GAS_URL}
{
  "action": "uploadToFolder",
  "payload": {
    "data": "base64EncodedImageData",
    "mimeType": "image/png",
    "filename": "custom_file.png",
    "folderId": "FOLDER_ID"
  }
}
```

## Troubleshooting

### Image not displaying
- Check if the Drive file has "Anyone with link" permission
- Verify the URL format: `https://drive.google.com/uc?export=view&id=FILE_ID`
- Check browser console for CORS errors

### Upload failing
- Verify GAS deployment URL is correct
- Check GAS execution logs: View > Logs in Apps Script
- Ensure file size is under 5MB

### CORS Issues
- GAS handles CORS automatically when deployed as web app
- Use `text/plain` content type for requests
- Avoid using `mode: 'no-cors'` as it prevents reading responses

## Development Mode

When the GAS URL contains `YOUR_DEPLOYMENT_ID`, the system runs in development mode:
- Files are converted to data URLs locally
- No actual Google Drive upload occurs
- Images are stored as base64 in Firebase (not recommended for production)

## Security Notes

1. The GAS web app runs under your Google account
2. Uploaded files inherit folder permissions
3. Firebase stores only the public URL, not the actual image
4. Consider adding file type validation in production
