# 🍎 Apple OAuth Setup Guide

## Prerequisites
- **Apple Developer Account** ($99/year) - Required for Apple Sign-In
- Sign up at [developer.apple.com](https://developer.apple.com/)

## Step 1: Create App ID
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. **Register an App ID**:
   - Description: `Job Bot`
   - Bundle ID: `com.jobbot.app` (or your preferred)
   - **Capabilities**: Enable "Sign In with Apple"

## Step 2: Create Service ID (Web)
1. **Identifiers** → **Register a new identifier**
2. **Service IDs**
3. **Register Service ID**:
   - Description: `Job Bot Web Service`
   - Identifier: `com.jobbot.web`
4. **Configure**:
   - Enable "Sign In with Apple"
   - **Primary App ID**: Select your App ID from Step 1
   - **Website URLs**:
     - Domain: `localhost`
     - Return URL: `http://localhost:8787/oauth/apple/callback`

## Step 3: Create Private Key
1. **Keys** → **Register a new key**
2. **Key Name**: `Job Bot Apple Auth Key`
3. **Enable**: Sign In with Apple
4. **Configure**: Select your primary App ID
5. **Download the .p8 file** - Save it securely!
6. **Note the Key ID** (shown after creation)

## Step 4: Get Team ID
1. **Membership** tab in Apple Developer
2. **Team ID** is shown (10-character string like `ABC123DEFG`)

## Step 5: Update Job Bot
Edit `secrets/api-keys.js`:
```javascript
apple: {
    clientId: 'com.jobbot.web',  // Your Service ID
    teamId: 'YOUR_TEAM_ID',      // From Step 4
    keyId: 'YOUR_KEY_ID',        // From Step 3
    privateKey: `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_CONTENT_HERE
-----END PRIVATE KEY-----`     // Content of .p8 file
},
```

## Mobile Setup (iOS/Android)

### For iOS (Native):
- Uses the App ID from Step 1
- Automatically works with Expo's Apple Authentication

### For Android:
- Apple Sign-In on Android requires web-based flow
- Uses the same Service ID as web

---

**Note**: Apple OAuth is complex and requires paid developer account. For testing, you can use Google OAuth or email signup instead.
