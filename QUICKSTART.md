# Quick Start Checklist

Complete this checklist to get your Real-Time Chat Application running:

## ✅ Firebase Setup (5 minutes)

- [ ] Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Enable Google Authentication
  - [ ] Go to Authentication > Sign-in method
  - [ ] Enable Google provider
  - [ ] Set support email
- [ ] Create Firestore Database
  - [ ] Go to Firestore Database
  - [ ] Start in production mode
  - [ ] Select default region
- [ ] Copy Firebase Config
  - [ ] Go to Project Settings
  - [ ] Copy all 6 config values

## ✅ Local Setup (2 minutes)

- [ ] Create `.env.local` file with Firebase config:
  ```
  VITE_FIREBASE_API_KEY=your_value
  VITE_FIREBASE_AUTH_DOMAIN=your_value
  VITE_FIREBASE_PROJECT_ID=your_value
  VITE_FIREBASE_STORAGE_BUCKET=your_value
  VITE_FIREBASE_MESSAGING_SENDER_ID=your_value
  VITE_FIREBASE_APP_ID=your_value
  ```
- [ ] Dependencies already installed

## ✅ Security Rules (1 minute)

- [ ] Go to Firestore > Rules
- [ ] Copy rules from `firestore-rules.js`
- [ ] Click Publish

## ✅ Run Locally (1 minute)

- [ ] Open terminal in project directory
- [ ] Run: `npm run dev`
- [ ] App opens at http://localhost:5173
- [ ] Test: Sign in with Google
- [ ] Test: Send a message
- [ ] Opens in another window to test multi-user

## ✅ Deploy (Optional, 5 minutes)

### Firebase Hosting

- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login: `firebase login`
- [ ] Initialize: `firebase init hosting`
- [ ] Build: `npm run build`
- [ ] Deploy: `firebase deploy`
- [ ] Your app is live at: `https://YOUR_PROJECT_ID.web.app`

### Vercel (Alternative)

- [ ] Push code to GitHub
- [ ] Import project in Vercel
- [ ] Add 6 environment variables
- [ ] Deploy (automatic)

## ✅ Production Checklist

Before sharing with others:

- [ ] Security rules are published in Firestore
- [ ] Google OAuth domain is authorized
  - [ ] Firebase Console > APIs & Services > OAuth consent screen
  - [ ] Add your domain under "Authorized JavaScript origins"
- [ ] Environment variables are set in production
- [ ] HTTPS is enabled (automatic with Firebase/Vercel)
- [ ] Tested signing in and sending messages
- [ ] Tested from multiple browsers/devices

## ✅ Testing

### Sign-In
- [ ] Can sign in with Google
- [ ] Profile picture shows
- [ ] Display name is correct
- [ ] Can logout

### Messaging
- [ ] Can send messages
- [ ] Messages appear instantly
- [ ] Cannot send empty message
- [ ] Auto-scrolls to latest
- [ ] Multiple users can chat simultaneously
- [ ] Messages show correct sender
- [ ] Timestamps are accurate

### UI/UX
- [ ] Responsive on mobile
- [ ] Smooth animations
- [ ] No console errors
- [ ] Loading states work

## 🎉 You're Done!

Your Firebase real-time chat app is ready to use!

**Next Steps:**
- Share your app URL with friends
- They can sign in and chat in real-time
- No backend server required!

## 📱 Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Deploy to Firebase | `firebase deploy` |
| View Firebase console | [console.firebase.google.com](https://console.firebase.google.com) |

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase not initialized" | Check `.env.local` values |
| "Permission denied" | Check Firestore rules are published |
| Can't sign in with Google | Enable Google provider in Auth settings |
| Messages not appearing | Check browser console and Firestore rules |

For more help, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)
