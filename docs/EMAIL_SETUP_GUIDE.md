# ClassSync Email & GAS Backend Setup Guide

This guide will help you set up the Google Apps Script (GAS) backend to enable real email functionality for OTP verification in ClassSync.

## Prerequisites

1. A Google Account
2. Access to Google Sheets
3. Access to Google Apps Script

---

## Step 1: Create the Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named **"ClassSync_Database"**
3. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SPREADSHEET_ID]/edit
   ```

---

## Step 2: Set Up the Required Sheets

Create these sheets (tabs) in your spreadsheet:

### Sheet: `Users`
| Column | Description |
|--------|-------------|
| A | id |
| B | username |
| C | password (hashed) |
| D | fullName |
| E | universityEmail |
| F | personalEmail |
| G | contactNumber |
| H | role |
| I | status |
| J | createdAt |

### Sheet: `OTP_Codes`
| Column | Description |
|--------|-------------|
| A | id |
| B | email |
| C | code |
| D | type |
| E | expiresAt |
| F | used |
| G | createdAt |

### Sheet: `Pending_Registrations`
| Column | Description |
|--------|-------------|
| A | id |
| B | studentId |
| C | email |
| D | verified |
| E | step |
| F | data (JSON) |
| G | createdAt |
| H | expiresAt |

### Sheet: `Applications`
| Column | Description |
|--------|-------------|
| A | id |
| B | studentId |
| C | universityEmail |
| D | fullName |
| E | status |
| F | submittedAt |
| G | data (JSON) |

---

## Step 3: Deploy the Google Apps Script Backend

1. Open your Google Spreadsheet
2. Go to **Extensions > Apps Script**
3. Delete any existing code in `Code.gs`
4. Copy the entire contents of `backend/GAS_Backend.js` and paste it
5. Update the `CONFIG` object at the top:

```javascript
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // From Step 1
  PROFILE_PICTURES_FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID', // Create a folder in Drive
  OTP_EXPIRY_MINUTES: 10
};
```

---

## Step 4: Create the Profile Pictures Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder named **"ClassSync_ProfilePictures"**
3. Right-click the folder > **Share** > **Anyone with the link can view**
4. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/[THIS_IS_YOUR_FOLDER_ID]
   ```
5. Update `PROFILE_PICTURES_FOLDER_ID` in the GAS config

---

## Step 5: Deploy as Web App

1. In Apps Script, click **Deploy > New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Configure:
   - **Description**: "ClassSync Backend v1"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. Click **Deploy**
5. **Authorize** the app when prompted (review permissions)
6. Copy the **Web app URL** - it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 6: Update the Frontend

Update the GAS URL in these files:

### `components/Registration.tsx`
```typescript
const GAS_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec';
```

### `services/registrationService.ts`
```typescript
const GAS_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec';
```

---

## Step 7: Test the Email Functionality

1. Start your development server: `npm run dev`
2. Navigate to the registration page
3. Enter a valid `.edu` or `.edu.ph` email
4. Click "Continue" to send OTP
5. Check your email for the verification code
6. Enter the code to verify

---

## How Email Sending Works

The GAS backend uses `GmailApp.sendEmail()` to send verification emails. This uses your Google account's Gmail to send emails.

### Email Quota Limits
- Free Google accounts: 100 emails/day
- Google Workspace: 1,500 emails/day

### Email Template
The backend sends a styled HTML email with:
- ClassSync branding
- 6-digit OTP code
- 10-minute expiration notice

---

## Troubleshooting

### "Network Error" when sending OTP
- Check that the GAS URL is correct
- Verify the web app is deployed with "Anyone" access
- Check browser console for CORS errors

### "Email not received"
- Check spam folder
- Verify the email address is correct
- Check GAS execution logs: **Apps Script > Executions**

### "Invalid OTP"
- OTP expires after 10 minutes
- Ensure you're entering the latest code
- Check if the code was already used

---

## Security Notes

1. **Never expose the Spreadsheet ID** to the frontend
2. **Hash passwords** before storing (the backend uses simple hash for demo - implement bcrypt for production)
3. **Consider rate limiting** OTP requests to prevent abuse
4. **Set up domain restrictions** in GAS for production

---

## Production Recommendations

For a production deployment, consider:

1. **Use a proper email service** (SendGrid, Mailgun, AWS SES) instead of GmailApp
2. **Implement rate limiting** to prevent OTP spam
3. **Add CAPTCHA** before sending OTP
4. **Use bcrypt** for password hashing
5. **Set up monitoring** for failed email attempts
6. **Configure a custom domain** for emails

---

## Support

If you encounter issues:
1. Check the GAS execution logs
2. Verify all sheet names match exactly
3. Ensure the spreadsheet and folder permissions are correct
