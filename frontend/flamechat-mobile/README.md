# FlameChat Mobile

A complete React Native mobile app for real-time team collaboration using Expo, Firebase, and TypeScript.

## ✨ Features Implemented

### 1. **Authentication**
- Email/Password sign-in and registration
- Google OAuth sign-in
- Firebase Auth integration
- Auto server profile sync on login

### 2. **Chat Messaging**
- Real-time message synchronization with Firestore
- Message pagination (load earlier messages on demand)
- Translation support (manual and auto modes)
- Message digests/catch-up summaries
- Read state tracking
- Typing indicators (see who's typing in real-time)
- Support for translated messages with original fallback

### 3. **User Profile**
- View and edit profile information (name, handle, email)
- Profile photo upload with image picker
- Identity validation and handle management
- Profile completion status tracking
- Settings and logout functionality

### 4. **Navigation**
- Tab-based navigation (Rooms | Profile)
- Stack navigation for chat screens
- Deep linking support
- Smooth transitions and animations

### 5. **Real-time Features**
- Live room updates
- Real-time message streaming
- Presence tracking via typing indicators
- Read state synchronization

## 📦 Setup

### Prerequisites
- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Firestore enabled
- Firebase credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your Firebase config:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

3. Start the development server:
```bash
npm run start
```

4. Run on your device/emulator:
   - Android: `npm run android`
   - iOS: `npm run ios`
   - Web: `npm run web`

## 🏗️ Architecture

### Project Structure
```
src/
├── context/          # Auth context and providers
├── firebase/         # Firebase configuration
├── hooks/           # Custom React hooks
│   ├── useAuth.ts
│   ├── useMessages.ts        # Pagination support
│   ├── useRooms.ts
│   ├── useTypingIndicator.ts # Real-time typing
│   └── useImagePicker.ts     # Image selection
├── navigation/      # React Navigation setup
├── screens/         # Screen components
│   ├── LoginScreen.tsx
│   ├── ChatScreen.tsx
│   ├── ProfileScreen.tsx
│   └── RoomListScreen.tsx
└── types/          # TypeScript type definitions
```

### Key Components

#### LoginScreen
- Email/password auth
- Google sign-in button
- Toggle between sign-in and registration
- Loading states and error handling

#### ChatScreen
- Real-time message list with FlatList
- Message pagination (load earlier messages)
- Typing indicators showing who's typing
- Message translation (manual/auto modes)
- Catch-up digest with AI summaries
- Input with send functionality
- Read state tracking

#### ProfileScreen
- Profile photo management (pick/take photo)
- Name and handle editing
- Identity validation
- Logout functionality
- Profile completion status

#### RoomListScreen
- List of available chat rooms
- Navigation to chat screen
- Real-time room updates

## 🔗 API Integration

The mobile app connects to the backend API at `http://localhost:3001/api`:

### Endpoints Used
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `POST /users/me/photo` - Upload profile photo
- `GET /rooms/{roomId}/read-state` - Get read state
- `POST /rooms/{roomId}/read-state` - Sync read state
- `GET /rooms/{roomId}/digest?limit=120&since=timestamp` - Get digest

## 🎨 UI/UX

- **Modern Design**: Clean, professional interface with enterprise colors
- **Responsive Layout**: Works on phones, tablets, and web
- **Dark Mode Ready**: Color palette supports light mode (expandable)
- **Accessibility**: Proper touch targets, clear labels, readable fonts
- **Loading States**: Visual feedback for async operations

## 🔒 Security

- Firebase authentication with email/password and Google OAuth
- JWT token-based API requests
- Firestore security rules enforcement
- Image upload validation and sizing

## 📝 Type Safety

Full TypeScript support with:
- Strict type checking
- Type definitions for all data models
- Async type handling with Promises
- Hook return type specifications

## 🚀 Performance

- Message pagination (50 messages per page by default)
- Efficient real-time listeners
- Debounced typing indicators
- Optimized re-renders with React hooks
- Image optimization and resizing

## 🧪 Testing

Run type checking:
```bash
npm run typecheck
```

## 📚 Future Enhancements

- [ ] Push notifications via Expo Notifications + FCM
- [ ] Message reactions (emoji)
- [ ] Message search functionality
- [ ] Voice messages
- [ ] Image sharing in messages
- [ ] Group video calls
- [ ] Offline message queue
- [ ] Dark mode toggle
- [ ] Multiple language support
- [ ] End-to-end encryption

## 🛠️ Development

### Available Scripts
- `npm run start` - Start Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Run on web (requires Expo Web)
- `npm run typecheck` - Run TypeScript type checking

### Dependencies
- `@react-navigation/*` - Navigation framework
- `expo` - React Native framework
- `firebase` - Backend services
- `expo-image-picker` - Image selection
- `react-native` - Core framework

## 📄 License

This project is part of the FlameChat enterprise platform.

## 👤 Support

For issues or feature requests, contact the FlameChat team.