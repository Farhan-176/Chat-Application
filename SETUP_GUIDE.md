# Real-Time Chat Application - Setup Guide

Complete step-by-step guide to get your Firebase chat application running.

## Table of Contents

1. [Firebase Project Setup](#firebase-project-setup)
2. [Local Development Setup](#local-development-setup)
3. [Running the Application](#running-the-application)
4. [Deployment to Firebase Hosting](#deployment-to-firebase-hosting)
5. [Troubleshooting](#troubleshooting)

---

## Firebase Project Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** or **"Add project"**
3. Enter project name (e.g., "real-time-chat-app")
4. Continue through setup (choose default settings)
5. Create the project

### Step 2: Enable Google Authentication

1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **"Get started"**
3. Click **"Google"** provider
4. Toggle **"Enable"** to ON
5. Set "Project support email" (will be pre-filled)
6. Click **"Save"**

### Step 3: Create Firestore Database

1. Go to **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Choose **Start in production mode**
4. Select default location (or your preferred region)
5. Click **"Create"**

Your database is now created at: `projects/[PROJECT-ID]/databases/(default)`

### Step 4: Copy Your Firebase Configuration

1. Go to **Project Settings** (gear icon, top right)
2. Click on **"Your apps"** section
3. If no app is registered, click **"</>"** (web app)
4. Register app (name it "chat-app")
5. Copy the config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCOXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef1234567890"
};
```

### Step 5: Deploy Firestore Security Rules

1. Go to **Firestore Database > Rules**
2. Replace all content with the rules from [firestore-rules.js](./firestore-rules.js)
3. Click **"Publish"**

This ensures only authenticated users can access messages.

---

## Local Development Setup

### Step 1: Install Dependencies

```bash
cd "Real Time Chat Application"
npm install
```

Expected output:
```
added XXX packages in XXs
```

### Step 2: Create Environment File

Create `.env.local` in the project root:

```bash
touch .env.local  # On Mac/Linux
type nul > .env.local  # On Windows
```

Add your Firebase config:
```
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

**Don't commit this file** - it's in `.gitignore`

### Step 3: Verify Installation

```bash
npm run build
```

If successful, you should see:
```
vite v5.0.8 building for production...
✓ XX modules transformed. (X ms)
dist/index.html                  X.XX kB │ gzip:  X.XX kB
dist/assets/index-XXXXX.js       XXX.XX kB │ gzip:  XX.XX kB
dist/assets/index-XXXXX.css      X.XX kB │ gzip:  X.XX kB
```

---

## Running the Application

### Development Mode

```bash
npm run dev
```

Output:
```
  VITE v5.0.8  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press q to quit
```

The app will open automatically at `http://localhost:5173`

### Testing the Chat

1. Sign in with Google (click "Sign in with Google")
2. Allow permissions
3. You're now authenticated!
4. Type a message and click "Send"
5. Open app in another browser/window to test multi-user chat

### Stopping the Dev Server

Press `q` in the terminal

---

## Deployment to Firebase Hosting

### Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- You're logged in: `firebase login`
- Production build ready: `npm run build`

### Deployment Steps

#### Option A: Automatic Deployment (Recommended)

```bash
# In the project directory
firebase deploy
```

Firebase will:
1. Build the project
2. Upload to Firebase Hosting
3. Deploy live

Your app will be available at: `https://YOUR_PROJECT_ID.web.app`

#### Option B: Manual Deployment

```bash
# Step 1: Initialize Firebase (first time only)
firebase init hosting

# Step 2: Select your project
# Step 3: Confirm "dist" as public directory
# Step 4: Say "yes" to rewrite rules for SPA

# Step 5: Build the app
npm run build

# Step 6: Deploy
firebase deploy
```

### After Deployment

1. Your app is live at `https://YOUR_PROJECT_ID.web.app`
2. Update your **Google OAuth consent screen** to allow your new domain:
   - Firebase Console > APIs & Services > OAuth consent screen
   - Add authorized JavaScript origins: `https://YOUR_PROJECT_ID.web.app`

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Frontend (Vite)            │
│   - Authentication Screen                │
│   - Chat Room UI                         │
│   - Message Display                      │
└──────────────┬──────────────────────────┘
               │ (Secure WebSockets)
               │
┌──────────────▼──────────────────────────┐
│      Firebase Services (BaaS)            │
│   ┌──────────────────────────┐          │
│   │ Authentication (Google)  │          │
│   │ UID: user authentication │          │
│   └──────────────────────────┘          │
│   ┌──────────────────────────┐          │
│   │  Firestore Database      │          │
│   │  - Real-time listeners   │          │
│   │  - Security Rules        │          │
│   │  - Server timestamps     │          │
│   └──────────────────────────┘          │
│   ┌──────────────────────────┐          │
│   │ Hosting (Firebase/Vercel)│          │
│   │ - Static file serving    │          │
│   │ - HTTPS/SSL              │          │
│   └──────────────────────────┘          │
└─────────────────────────────────────────┘
```

---

## Security Implementation

### 1. Authentication
- Google OAuth via Firebase Auth
- Automatic session management
- Auto-logout on sign out

### 2. Message Integrity
- Server-generated timestamps (no client-side time trust)
- UID verification in Firestore rules
- Users can't spoof other users' messages

### 3. Access Control
- Firestore security rules require authentication
- Rules validate message structure
- Users can only delete their own messages

### 4. Data Validation
- Client-side: Message must not be empty
- Server-side: Firestore rules enforce validation

---

## Monitoring & Debugging

### Check Firebase Status

Firebase Console > Firestore:
- View real-time data
- Check active listeners
- View security rule violations

### View Logs

Browser DevTools (F12):
- Console tab: Check for errors
- Network tab: View Firebase API calls

### Common Issues

| Issue | Solution |
|-------|----------|
| "Firebase not initialized" | Check `.env.local` has correct values |
| "Permission denied" | Check Firestore rules are published |
| "Can't sign in with Google" | Enable Google provider in Firebase Auth |
| Messages not appearing | Check browser console for errors |
| Slow performance | Check Firestore indexes in dashboard |

---

## Scaling Considerations

### Current Implementation (v1.0)
- Single "general" chat room
- Latest 50 messages loaded
- Real-time listeners for all connected users

### Optimization Tips (v2.0+)

1. **Multiple Rooms**
   - Create separate collections for each room
   - Users select active room
   - Fewer listeners = less cost

2. **Pagination**
   - Load 20 messages initially
   - Load more on scroll-up
   - Reduces initial load time

3. **Message ArchVal**
   - Move old messages to archive collection
   - Keep active collection small
   - Archive older than 30 days

4. **Batch Writes**
   - Multiple messages → single write
   - Reduces Firestore operations

---

## Cost Estimation

Firebase Free Tier includes:
- 1 GB Firestore storage
- 50,000 reads/day
- 20,000 writes/day
- 100 simultaneous connections

**Typical Usage (100 users, 50 messages/day):**
- Reads: ~1,500/day ✅ (well under limit)
- Writes: ~50/day ✅ (well under limit)
- Cost: **$0 per month** (free tier)

---

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Configure authentication
3. ✅ Deploy security rules
4. ✅ Add environment variables
5. ✅ Run locally
6. ✅ Deploy to Firebase Hosting
7. 🚀 Invite users to test!

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [React Documentation](https://react.dev)

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Check browser console (F12) for errors
3. Check Firebase Console for security rule violations
4. Review [README.md](./README.md) for more details
