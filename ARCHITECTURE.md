# Real-Time Chat Application - Architecture

Comprehensive technical architecture documentation for the Firebase-powered real-time chat application.

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                  React Application Layer                 │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ AuthScreen   │  │  ChatRoom    │  │   App        │   │
│  │ - Login UI   │  │ - Main view  │  │ - Router     │   │
│  │ - OAuth      │  │ - Header     │  │ - State mgmt │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                  │                  │           │
│  ┌──────────────────────────────────────────────────┐   │
│  │       Message Components                          │   │
│  │  ┌─────────────────┐  ┌─────────────────────┐   │   │
│  │  │  MessageList    │  │  MessageInput       │   │   │
│  │  │  - Render msgs  │  │  - Handle send      │   │   │
│  │  │  - Auto-scroll  │  │  - Validation       │   │   │
│  │  └─────────────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
          │                      │
          └──────────┬───────────┘
                     │
         ┌───────────▼────────────┐
         │  Firebase SDK Layer    │
         ├────────────────────────┤
         │  firebase.ts Config    │
         │  - Auth Instance       │
         │  - Firestore Instance  │
         │  - Google Provider     │
         └─────────┬──────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│           Firebase Backend (BaaS)                       │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────┐   ┌──────────────────────────┐  │
│  │ Authentication   │   │ Firestore Database       │  │
│  │ ┌──────────────┐ │   │ ┌──────────────────────┐ │  │
│  │ │ Google OAuth │ │   │ │ chatRooms/general/   │ │  │
│  │ │ UID: abc123  │ │   │ │  messages/ (coll)    │ │  │
│  │ │ Session token│ │   │ │ ┌──────────────────┐ │ │  │
│  │ └──────────────┘ │   │ │ │ messageId: {      │ │ │  │
│  │                  │   │ │ │   text: "..."     │ │ │  │
│  │ Real-time        │   │ │ │   uid: "abc123"   │ │ │  │
│  │ Session Mgmt     │   │ │ │   createdAt: ts   │ │ │  │
│  └──────────────────┘   │ │ │ }                 │ │ │  │
│                         │ │ └──────────────────┘ │ │  │
│                         │ │ Security Rules       │ │  │
│                         │ │ - Auth required      │ │  │
│                         │ │ - UID validation     │ │  │
│                         │ └──────────────────────┘ │  │
│                         │                           │  │
│  ┌──────────────────┐   │ Real-time Listener      │  │
│  │ Hosting          │   │ - onSnapshot()          │  │
│  │ - Static files   │   │ - Auto-sync messages    │  │
│  │ - HTTPS/TLS      │   │ - 50 msg limit          │  │
│  └──────────────────┘   │                           │  │
└──────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. App Component (Root)
**Location:** `src/App.tsx`

**Responsibilities:**
- Manages authentication state
- Routes between AuthScreen and ChatRoom
- Handles logout

**Key Methods:**
```typescript
handleAuthSuccess(user: User) → void
handleLogout() → Promise<void>
```

### 2. AuthScreen Component
**Location:** `src/components/AuthScreen.tsx`

**Responsibilities:**
- Display login UI
- Handle Google OAuth sign-in
- Monitor auth state on mount
- Navigate to ChatRoom on success

**Flow:**
```
User clicks Google Sign-In
         ↓
signInWithPopup(auth, googleProvider)
         ↓
Firebase Auth Dialog
         ↓
User authorizes
         ↓
onAuthSuccess() called
         ↓
ChatRoom displayed
```

**State:**
- `loading: boolean` - Loading indicator

### 3. ChatRoom Component
**Location:** `src/components/ChatRoom.tsx`

**Responsibilities:**
- Main chat interface
- Set up real-time listener
- Handle message sending
- Display header with user info

**Data Flow:**
```
Component Mounts
         ↓
useEffect hooks:
  - Set up Firestore listener (onSnapshot)
  - Query: orderBy(createdAt), limit(50)
         ↓
Firestore returns messages
         ↓
Update state → Re-render
         ↓
Component Unmounts
  - Unsubscribe from listener
```

**State:**
- `messages: Message[]` - Current messages
- `loading: boolean` - Initial load state

### 4. MessageList Component
**Location:** `src/components/MessageList.tsx`

**Responsibilities:**
- Render all messages
- Apply own/other styling
- Auto-scroll to bottom

**Auto-Scroll Logic:**
```typescript
useEffect(() => {
  setTimeout(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, 0)
}, [messages])
```

**Message Bubble:**
- Own message: Blue, right-aligned
- Other message: Gray, left-aligned, shows sender name

### 5. MessageInput Component
**Location:** `src/components/MessageInput.tsx`

**Responsibilities:**
- Text input for new messages
- Message validation
- Handle send on Enter key
- Loading state during send

**Validation:**
```typescript
const trimmedMessage = message.trim()
if (!trimmedMessage) return  // Prevent empty
```

**Key Binding:**
- Enter: Send message
- Shift+Enter: New line

## Data Models

### User Type
```typescript
interface User {
  uid: string                    // Firebase UID
  displayName: string | null     // From Google OAuth
  photoURL: string | null        // From Google OAuth
  email: string | null           // From Google
}
```

### Message Type
```typescript
interface Message {
  id: string                     // Firestore doc ID
  text: string                   // Message content
  uid: string                    // Author UID (from Firebase)
  displayName: string            // Author display name
  photoURL: string | null        // Author profile pic
  createdAt: Date                // Server timestamp (converted)
}
```

### Firestore Message Document
```javascript
{
  text: "Hello world",                    // User input
  uid: "oTwJ9x7k3mN2pQr5sT8u1V",         // Firebase Auth UID
  displayName: "John Doe",                // Google profile name
  photoURL: "https://lh3.googleusercontent.com/...",
  createdAt: Timestamp(secs, nanos)      // serverTimestamp()
}
```

## Real-Time Synchronization

### Message Flow: Sending

```
User Types Message
         ↓
Clicks Send Button
         ↓
MessageInput: handleSubmit()
         ↓
Validate (not empty)
         ↓
onSendMessage(text)
         ↓
addDoc(messagesCollection, {
  text,
  uid: user.uid,
  displayName: user.displayName,
  createdAt: serverTimestamp()
})
         ↓
Firebase stores doc
         ↓
onSnapshot listener triggered
         ↓
Message added to local state
         ↓
MessageList re-renders
         ↓
Auto-scroll to bottom
```

### Message Flow: Receiving

```
Other User Sends Message
         ↓
Firebase Firestore updated
         ↓
Listener onSnapshot() triggers
         ↓
Query returns updated docs
         ↓
ChatRoom state updated
         ↓
MessageList receives new props
         ↓
Re-renders with new message
         ↓
Auto-scroll smoothly
```

## Firestore Structure

### Collections & Rules

```
chatRooms/
├── general/
│   └── messages/
│       ├── msg001/
│       │   ├── text: "Hello"
│       │   ├── uid: "user123"
│       │   ├── displayName: "Alice"
│       │   ├── photoURL: "..."
│       │   └── createdAt: timestamp
│       ├── msg002/
│       │   └── ...
│       └── [Up to 50 latest]
```

### Security Rules

**Key Rules:**
```javascript
// Read: Only authenticated users
allow read: if request.auth != null;

// Create: Must be authenticated + UID match
allow create: if request.auth != null 
  && request.resource.data.uid == request.auth.uid
  && request.resource.data.text is string
  && request.resource.data.text.size() > 0;

// Delete: Only message author
allow delete: if request.auth.uid == resource.data.uid;
```

## Authentication Flow

### Sign-In Flow

```
1. App loads
   └─ useEffect: onAuthStateChanged()

2. Check if user already logged in
   ├─ Yes → Load ChatRoom
   └─ No → Load AuthScreen

3. User clicks "Sign in with Google"
   └─ signInWithPopup(auth, googleProvider)

4. Google OAuth popup appears
   └─ User authorizes

5. Firebase returns user object
   └─ uid, displayName, photoURL, email

6. onAuthSuccess() callback
   └─ Set user state → ChatRoom rendered

7. Component cleanup
   └─ onAuthStateChanged unsubscribe
```

### Sign-Out Flow

```
User clicks Logout
         ↓
handleLogout()
         ↓
signOut(auth)
         ↓
Firebase clears session
         ↓
User state → null
         ↓
AuthScreen rendered
         ↓
Firestore listeners cleaned up
```

## State Management

### Client State (React Hooks)

**AuthScreen:**
- `loading: boolean` - Auth check in progress

**ChatRoom:**
- `messages: Message[]` - Message list
- `loading: boolean` - Initial load

**MessageInput:**
- `message: string` - Input field value
- `isLoading: boolean` - Send in progress

### Server State (Firebase)

- Active user session
- Message documents in Firestore
- Real-time listener subscriptions

## Performance Optimizations

### 1. Message Limiting
- Query `limit(50)` - Only fetch latest 50
- Reduces initial load time
- Reduces bandwidth

### 2. Smooth Scrolling
- `scrollIntoView({ behavior: 'smooth' })`
- Uses CSS transitions
- Non-blocking animation

### 3. Textarea Auto-Resize
- Single `rows={1}` by default
- Expands with content
- `max-height: 120px` limit

### 4. Listener Cleanup
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(...)
  return () => unsubscribe()  // Cleanup
}, [])
```

### 5. Conditional Rendering
- Only show spinner during load
- Update only affected components
- Efficient re-renders

## Security Implementation

### 1. UID Verification
**Problem:** Client could lie about user ID
**Solution:** Firestore rules verify `uid == request.auth.uid`

```javascript
allow create: if request.resource.data.uid == request.auth.uid
```

### 2. Server Timestamps
**Problem:** Client could backdate messages
**Solution:** Use `serverTimestamp()` in client, rules enforce timestamp

```javascript
createdAt: serverTimestamp()  // Client
allow create: if request.resource.data.createdAt is timestamp  // Rules
```

### 3. Authentication Required
**Problem:** Unauthenticated users could read messages
**Solution:** All rules start with `if request.auth != null`

### 4. Validation Rules
**Problem:** Invalid data could be stored
**Solution:** Firestore rules validate message structure

```javascript
&& request.resource.data.text is string
&& request.resource.data.text.size() > 0
&& request.resource.data.displayName is string
```

## Error Handling

### Network Errors
```typescript
onSnapshot(q, (snapshot) => {
  // Success
}, (error) => {
  console.error('Error:', error)
  setLoading(false)
})
```

### Message Validation
```typescript
const trimmedMessage = message.trim()
if (!trimmedMessage) return  // Prevent empty send
```

### Send Errors
```typescript
try {
  await onSendMessage(trimmedMessage)
} catch (error) {
  alert('Failed to send message')
}
```

## Deployment Architecture

### Firebase Hosting
```
┌──────────────────────┐
│  Your Domain         │
│  (custom or .web.app)│
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Firebase Hosting    │
│  - CDN               │
│  - HTTPS/TLS         │
│  - Static files      │
│  - SPA rewrites      │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  dist/               │
│  ├── index.html      │
│  ├── assets/         │
│  └── ...             │
└──────────────────────┘
```

### Vercel Deployment
```
GitHub Repository
       ↓
Vercel auto-deploy
       ↓
Build: npm run build
       ↓
Output: dist/
       ↓
CDN Distribution
       ↓
Your Domain
```

## Scaling Considerations

### Current Limitations (v1.0)
- Single chat room
- All users see same messages
- 50 message limit
- No pagination

### Version 2.0 Enhancements
- **Multiple Rooms:** Separate collections per room
- **Typing Indicators:** Track who's typing
- **Presence:** Show online users
- **Read Receipts:** Track read status
- **Pagination:** Load more messages on scroll

### Firestore Scaling
- **Indexed:** `createdAt` automatically indexed
- **Cost:** ~$6/month at 10K reads/day
- **Limits:** 500 concurrent connections per database

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component, auth routing |
| `src/firebase.ts` | Firebase config & instances |
| `src/types/index.ts` | TypeScript interfaces |
| `src/components/AuthScreen.tsx` | Login UI & OAuth |
| `src/components/ChatRoom.tsx` | Main chat view |
| `src/components/MessageList.tsx` | Message rendering |
| `src/components/MessageInput.tsx` | Send message input |
| `firestore-rules.js` | Security rules |
| `firebase.json` | Hosting config |

## Testing Checklist

- [ ] User can sign in with Google
- [ ] Messages appear instantly (< 1s)
- [ ] Auto-scroll works on new message
- [ ] Cannot send empty message
- [ ] Cannot spoof another user's UID
- [ ] Messages show correct sender
- [ ] Timestamps are accurate
- [ ] Logout works properly
- [ ] Listener cleans up on logout
- [ ] App works on mobile
- [ ] Works with multiple browser tabs

## Resources

- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [React Hooks](https://react.dev/reference/react)
- [Vite Guide](https://vitejs.dev)
