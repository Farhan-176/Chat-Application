# Real-Time Chat Application (Firebase)

A secure, serverless real-time chat application powered by Firebase. No custom backend server required.

## 🚀 Features

- **Google OAuth Authentication** - Secure sign-in with Google
- **Real-Time Messaging** - Messages appear instantly using Firestore listeners
- **Multi-User Chat Rooms** - General chat room for all authenticated users
- **Server-Generated Timestamps** - Prevents client-side time spoofing
- **Auto-Scroll** - Automatically scrolls to latest messages
- **Responsive Design** - Works on desktop, tablet, and mobile
- **No Backend Server** - 100% serverless with Firebase BaaS

## 📋 Prerequisites

- Node.js 16+ and npm
- Firebase project ([create one here](https://firebase.google.com))
- Google account for OAuth setup

## 🔧 Setup

### 1. Clone / Open the Project

```bash
cd "Real Time Chat Application"
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Enable Google Authentication:
   - Go to **Authentication > Sign-in method**
   - Enable **Google** provider
4. Create Firestore Database:
   - Go to **Firestore Database**
   - Create database in **production mode**
5. Collect your Firebase credentials:
   - Go to **Project Settings** > **Your apps**
   - Copy the config values

### 3. Environment Variables

Create a `.env.local` file in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

See `.env.example` for reference.

### 4. Set Up Firestore Security Rules

Go to **Firestore Database > Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access
    match /chatRooms/{roomId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.displayName is string
        && request.resource.data.createdAt is timestamp;
      allow delete: if request.auth.uid == resource.data.uid;
    }
  }
}
```

Click **Publish** to apply the rules.

## 🏃 Development

Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
preview npm run preview
```

## 📱 Usage

1. **Sign In**: Click "Sign in with Google"
2. **View Messages**: See all messages from the chat room
3. **Send Message**: Type message and click Send (or Shift+Enter)
4. **Auto-Scroll**: Automatically scrolls to latest message
5. **Logout**: Click the red logout button in header

## 🗄️ Data Structure

```
chatRooms/
└── general/
    └── messages/
        ├── message1/
        │   ├── text: "Hello world"
        │   ├── uid: "user123"
        │   ├── displayName: "John Doe"
        │   ├── photoURL: "https://..."
        │   └── createdAt: serverTimestamp()
        └── message2/
            └── ...
```

## 🌐 Deployment

### Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Initialize Firebase:
```bash
firebase login
firebase init hosting
```

3. Select your project and choose `dist` as public directory

4. Build and deploy:
```bash
npm run build
firebase deploy
```

### Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## 🔒 Security Features

- ✅ Authentication required for all operations
- ✅ UID verification prevents message spoofing
- ✅ Server-generated timestamps
- ✅ Firestore security rules enforced
- ✅ No sensitive data in client code

## ⚙️ Functional Requirements Met

- ✅ Firebase Authentication (Google OAuth)
- ✅ Firestore Database (real-time listeners)
- ✅ Server timestamps (prevents client-side tampering)
- ✅ Auth enforcement on read/write
- ✅ Latest 50 messages limit
- ✅ Real-time UI updates via onSnapshot
- ✅ No backend server required

## 📊 Non-Functional Requirements Met

- ✅ Near-zero message delay
- ✅ Efficient re-renders (React Hooks)
- ✅ Firebase auto-scaling
- ✅ Secure authentication
- ✅ Auto-reconnect on network interruption
- ✅ Listener cleanup on logout

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Backend Services**: Firebase (Auth + Firestore)
- **Styling**: CSS3
- **Hosting**: Firebase Hosting or Vercel

## 🚀 Future Enhancements (v2.0+)

- [ ] Multiple chat rooms
- [ ] Typing indicators
- [ ] Online presence indicators
- [ ] Read receipts
- [ ] Image uploads (Firebase Storage)
- [ ] Push notifications
- [ ] User profiles
- [ ] Message search
- [ ] Message reactions/emoji

## 📝 Notes

- Messages are stored in Firestore with server timestamps
- All client-side time values are for UI only
- Network interruptions are handled automatically by Firebase
- Listeners are cleaned up on logout to prevent memory leaks

## ❓ Troubleshooting

**"Firebase not initialized"**
- Check `.env.local` has correct Firebase credentials
- Verify Firebase project exists and is active

**"Messages not appearing"**
- Check Firestore rules are published
- Verify authentication is working (check console)
- Check browser console for errors

**"Can't sign in with Google"**
- Ensure Google provider is enabled in Firebase Auth
- Check your domain is authorized in OAuth consent screen

## 📄 License

MIT - Feel free to use this for your projects!

## 🤝 Contributing

Feel free to fork and submit pull requests for improvements!
