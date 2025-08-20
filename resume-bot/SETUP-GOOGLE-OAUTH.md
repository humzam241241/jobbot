# 🔐 Google OAuth Setup Guide

## Why You Need This
The error you're seeing (`Error 401: invalid_client`) means Google doesn't recognize our OAuth application. We need to register Job Bot with Google to enable "Continue with Google" sign-in.

## ⚡ Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select existing project
3. Name it: "Job Bot" or whatever you prefer

### Step 2: Enable Google Sign-In API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sign-In API" or "Identity Toolkit API"
3. Click "Enable"

### Step 3: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. **Application type**: Web application
4. **Name**: Job Bot Web Client
5. **Authorized redirect URIs**: Add this EXACT URL:
   ```
   http://localhost:8787/oauth/google/callback
   ```
6. Click "Create"

### Step 4: Copy Your Credentials
Google will show you:
- **Client ID**: Something like `123456-abcdef.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abcdef123456`

### Step 5: Update Job Bot
1. Open `secrets/api-keys.js` in your project
2. Replace the Google section:
   ```javascript
   google: {
       clientId: 'YOUR_ACTUAL_CLIENT_ID_HERE',
       clientSecret: 'YOUR_ACTUAL_CLIENT_SECRET_HERE'
   },
   ```
3. Restart Job Bot: close terminal and run `start.bat` again

## ✅ Test It
1. Go to http://localhost:8081
2. Click "Continue with Google"
3. Should redirect to real Google sign-in page
4. After signing in, you'll be back in Job Bot as a logged-in user

## 🔧 Troubleshooting

**Still getting "invalid_client"?**
- Double-check the redirect URI is exactly: `http://localhost:8787/oauth/google/callback`
- Make sure you saved the credentials correctly
- Restart the app after changing secrets

**Want to test with your admin email?**
- Sign in with `mystrye827@gmail.com` or `humzam241@outlook.com`
- Should automatically redirect to admin dashboard

## 🍎 Apple OAuth (Optional)
Apple OAuth is more complex and requires:
- Apple Developer Account ($99/year)
- Service ID registration
- Private key generation

For now, I've disabled Apple OAuth. Users can sign in with Google or email instead.

---

**Need help?** The setup should take about 5 minutes. Let me know if you hit any issues!
