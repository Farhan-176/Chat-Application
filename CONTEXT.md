# FlameChat — Architecture & Implementation Status

**Last Updated**: April 23, 2026  
**Version**: v2.1.0 (Phase 0 Complete)

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Feature Status](#feature-status)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Deployment](#deployment)
7. [Development Roadmap](#development-roadmap)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase project (already configured)
- Gemini API key (required for AI features)

### Environment Setup
```bash
# 1. Get Gemini API key
# Visit: https://aistudio.google.com
# Click "Get API Key" → Create new API key

# 2. Add to .env.local
VITE_GEMINI_API_KEY=your_api_key_here

# 3. Install & run
cd frontend && npm install && npm run dev
cd backend/server && npm install && npm run dev
```

### Deploy Frontend
```bash
npm run build
# Deploys to Vercel automatically (configured in vercel.json)
```

### Deploy Backend
```bash
# Backend runs on Vercel Functions or self-hosted Express
# See backend/server/README.md
```

---

## Architecture Overview

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Firebase Admin SDK
- **Database**: Firestore + Firebase Realtime
- **Auth**: Firebase Authentication (no phone number required)
- **AI**: Google Gemini API (text analysis, translation, summarization)
- **File Storage**: Firebase Cloud Storage
- **Payments**: Stripe (for paid channels - Phase 3)
- **Maps**: Google Maps Embed API (for geofenced rooms - Phase 3)

### Project Structure
```
real-time-chat-application/
├── frontend/
│   ├── src/
│   │   ├── core/                    # Shared config, API, types
│   │   │   ├── shared/
│   │   │   │   ├── api/             # API clients (chatApi, geminiService, fileUploader)
│   │   │   │   ├── config/          # Firebase, feature flags
│   │   │   │   ├── types/           # TypeScript interfaces
│   │   │   │   └── components/      # Shared UI (ProfileModal)
│   │   │   └── app/                 # Main App.tsx, routing
│   │   └── features/
│   │       ├── auth/                # Login/signup screens
│   │       ├── chat/                # ChatRoom, MessageList, MessageInput, AIPanel
│   │       ├── rooms/               # RoomList, RoomSidebar (room creation/management)
│   │       ├── users/               # User profiles
│   │       ├── vault/               # Message vault (Phase 3 - not yet created)
│   │       └── channels/            # Paid channels (Phase 3 - not yet created)
│   ├── flamechat-mobile/            # React Native mobile app (future)
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   ├── server/                      # Express.js API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # Authentication routes
│   │   │   │   ├── chat/            # Messages, rooms, AI intelligence, translations
│   │   │   │   ├── users/           # User management
│   │   │   │   ├── workspaces/      # Workspace management
│   │   │   │   └── billing/         # Stripe integration (Phase 3)
│   │   │   ├── middleware/          # Auth, error handling, RBAC
│   │   │   ├── services/            # Business logic (mood analysis, translation, etc.)
│   │   │   ├── config/              # Firebase Admin, feature flags, LLM config
│   │   │   └── app.ts               # Express app setup
│   │   └── package.json
│   └── functions/                   # Firebase Cloud Functions (minimal)
├── firestore.rules                  # Firestore security rules
├── firebase.json                    # Firebase config
├── vercel.json                      # Vercel deployment config
└── package.json                     # Root workspace config
```

---

## Feature Status

### ✅ Core Features (Complete)
| Feature | Status | Details |
|---------|--------|---------|
| **Authentication** | ✅ | Firebase UID + custom username (no phone required) |
| **Real-time Chat** | ✅ | WebSocket messaging, presence, typing indicators |
| **Workspaces** | ✅ | Multi-workspace support with roles (owner/admin/moderator/member) |
| **Rooms** | ✅ | Public/private rooms, member management |
| **Messages** | ✅ | Text, attachments, reactions, search, edit/delete |
| **AI Summarization** | ✅ | Gemini API: "Catch Me Up" in 50 messages |
| **Mood Analysis** | ✅ | Emoji + color + sentiment on every message |
| **Tone Rewriting** | ✅ | Professional/friendly/shorter/direct/casual styles |
| **Translation** | ✅ | Room-level + per-message translation |
| **Ephemeral Messages** | ✅ | Ghost mode (TTL) + scheduled dissolution |
| **Room Digest** | ✅ | AI-generated summaries of room activity |
| **Content Moderation** | ✅ | AI-powered with context awareness |
| **File Uploads** | ✅ | Images, documents to Cloud Storage |

### Phase 1: 🚀 IN PROGRESS (Vibe Rooms + AI)
| Feature | Status | Details |
|---------|--------|---------|
| **Vibe Schema** | ✅ | Added to Firestore chatRooms |
| **CSS Vibe Themes** | ✅ | 5 themes created (lofi, hype, focus, chill, midnight) |
| **Vibe Picker Component** | ✅ | React component with 6 cards, color preview, selection |
| **Dynamic Theme Loading** | ✅ | CSS injected on room load via vibeUtils |
| **Room Creation Integration** | ✅ | VibePicker integrated into RoomSidebar modal |
| **AIPanel Enhancements** | 🔄 | Icons, loading states, sharing (optional)

### 🔄 Phase 2: Time Capsule + Ephemeral Rooms + Translation UX (Not Started)
| Feature | Status | Details |
|---------|--------|---------|
| **Time Capsule Messages** | 🔄 | Sealed messages (sealedUntil timestamp) |
| **Ephemeral Rooms** | 🔄 | Self-destructing rooms with countdown |
| **Per-Message Translate** | 🔄 | 🌐 button on every message |
| **Tone Rewriter UX** | 🔄 | Before/After preview |

### 🎯 Phase 3: Vault + Creator + Geofence (Not Started)
| Feature | Status | Details |
|---------|--------|---------|
| **Message Vault** | 🔄 | Star messages → searchable knowledge base |
| **Creator Channels** | 🔄 | Stripe subscription-gated channels |
| **Geofenced Rooms** | 🔄 | Location-based room discovery |

---

## Database Schema

### Collections Overview

#### `users`
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "status": "online|offline|away",
  "role": "user|admin",
  "workspaceIds": ["ws-id-1", "ws-id-2"],
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

#### `workspaces`
```json
{
  "name": "My Team",
  "description": "Team collaboration space",
  "icon": "emoji",
  "ownerId": "uid",
  "ownerName": "John",
  "memberCount": 42,
  "isPrivate": false,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

#### `chatRooms`
```json
{
  "name": "general",
  "description": "General discussion",
  "visibility": "public|private",
  "vibe": "default|lofi|hype|focus|chill|midnight",
  "createdBy": "uid",
  "workspaceId": "ws-id",
  "memberCount": 15,
  "translationMode": "off|manual|auto",
  "defaultLanguage": "en",
  "expiresAt": null | "Timestamp",      // Phase 2: Ephemeral rooms
  "createdAt": "Timestamp"
}
```

#### `chatRooms/{roomId}/messages`
```json
{
  "text": "Hello world",
  "uid": "user-id",
  "displayName": "John",
  "photoURL": "https://...",
  "createdAt": "Timestamp",
  
  // AI Enrichment
  "mood": "joy|anger|calm|excitement|sadness|neutral",
  "moodEmoji": "😊",
  "moodColor": "#6366f1",
  "moodConfidence": 0.95,
  
  // Ephemeral (Phase 1)
  "isEphemeral": true,
  "ttl": 30,
  "expiresAt": "Timestamp",
  "status": "active|dissolved",
  
  // Phase 2: Time Capsule
  "sealedUntil": null | "Timestamp",
  
  // Reactions & Attachments
  "reactions": ["👍", "❤️"],
  "attachments": [
    {
      "name": "report.pdf",
      "url": "https://...",
      "type": "application/pdf",
      "size": 1024
    }
  ]
}
```

#### `chatRooms/{roomId}/presence` (Real-time)
```json
{
  "userId": "uid",
  "displayName": "John",
  "photoURL": "https://...",
  "status": "online",
  "lastSeen": "Timestamp"
}
```

#### `chatRooms/{roomId}/typing` (Real-time)
```json
{
  "userId": "uid",
  "displayName": "John",
  "isTyping": true
}
```

### Phase 2 Schema Additions
```json
// messages
{
  "sealedUntil": null | "Timestamp"    // Time capsule feature
}

// chatRooms
{
  "expiresAt": null | "Timestamp"      // Ephemeral rooms
}
```

### Phase 3 Schema Additions
```json
// users/{uid}/vault
{
  "messageId": "msg-id",
  "text": "Important decision made",
  "roomId": "room-id",
  "senderName": "John",
  "aiTags": ["#decision", "#bug-fix"],
  "savedAt": "Timestamp"
}

// channels (new collection)
{
  "name": "Premium Tips",
  "creatorId": "uid",
  "description": "Weekly AI insights",
  "price": 9.99,
  "currency": "USD",
  "memberCount": 342,
  "stripeProductId": "prod_xxx",
  "stripePriceId": "price_xxx",
  "createdAt": "Timestamp"
}

// channels/{channelId}/subscriptions
{
  "userId": "uid",
  "stripeSubscriptionId": "sub_xxx",
  "status": "active|paused|canceled",
  "renewalDate": "Timestamp",
  "subscribedAt": "Timestamp"
}

// chatRooms (extended)
{
  "geofence": {
    "enabled": false,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radiusMeters": 500,
    "name": "Times Square"
  }
}
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `POST /api/auth/logout` — Sign out
- `POST /api/auth/refresh` — Refresh token

### Chat Messages
- `GET /api/messages/:roomId` — Fetch messages with pagination
- `POST /api/messages/:roomId` — Send message
- `PATCH /api/messages/:roomId/:messageId` — Edit message
- `DELETE /api/messages/:roomId/:messageId` — Delete message
- `POST /api/messages/:roomId/:messageId/react` — Add reaction

### Chat Rooms
- `GET /api/rooms` — List user's rooms
- `POST /api/rooms` — Create room
- `GET /api/rooms/:roomId` — Get room details
- `PATCH /api/rooms/:roomId` — Update room (name, vibe, description)
- `DELETE /api/rooms/:roomId` — Delete room
- `POST /api/rooms/:roomId/members/:userId` — Add member
- `DELETE /api/rooms/:roomId/members/:userId` — Remove member

### AI Intelligence
- `POST /api/ai/analyze-message` — Analyze message context & mood
- `POST /api/ai/moderate` — Content moderation with context
- `GET /api/ai/digest/:roomId` — Generate room digest
- `POST /api/ai/summarize` — Summarize messages
- `POST /api/ai/translate` — Translate text
- `POST /api/ai/rewrite` — Rewrite message tone

### Translations
- `GET /api/translations/:roomId/:messageId` — Get message translation
- `POST /api/translations/:roomId/:messageId` — Translate message

### Future (Phase 3)
- `GET /api/vault` — Fetch user's vault
- `POST /api/vault/save` — Save message to vault
- `DELETE /api/vault/:messageId` — Remove from vault
- `GET /api/vault/search` — Search vault
- `POST /api/stripe/create-subscription` — Subscribe to channel
- `GET /api/rooms/nearby?lat=40&lng=-74&radius=1000` — Nearby geofenced rooms

---

## Feature Flags

Located in: `frontend/src/core/shared/config/featureFlags.ts`

```typescript
export const featureFlags = {
  aiPanel: true,                    // AI Intelligence Panel (Catch Me Up, Mood Read, Key Points)
  roomDigest: true,                 // Room digest generation
  roomTranslationToggle: true,      // Room-level translation on/off
  ephemeralRooms: true,             // Ephemeral messages (ghost mode, TTL)
  aiMoodAnalysis: true,             // Mood emoji on messages
  contentModeration: true,          // AI-powered content moderation
  
  // Phase 1
  vibeRooms: false,                 // Vibe rooms (CSS themes)
  
  // Phase 2
  timeCapsuleMessages: false,       // Sealed messages
  perMessageTranslate: false,       // Per-message translate button
  
  // Phase 3
  messageVault: false,              // Starred messages knowledge base
  creatorChannels: false,           // Stripe-paid channels
  geofencedRooms: false,            // Location-based rooms
}
```

---

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Automatically deployed via Vercel
# Set VITE_GEMINI_API_KEY in Vercel Environment Variables
```

### Backend (Vercel Functions or Self-hosted)
```bash
cd backend/server
npm install
npm run build
npm start
```

**Environment Variables Required**:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `GEMINI_API_KEY`
- `NODE_ENV` (development|production)

**Firestore Rules**: See `firestore.rules`

---

## Development Roadmap

### Phase 0: ✅ COMPLETE
- [x] Get Gemini API key
- [x] Delete 13 experimental components
- [x] Fix build errors
- [x] Create CONTEXT.md

### Phase 1: ✅ COMPLETE (Vibe Rooms + AI)
**Completed: 8-10 hours of work**

- [x] 1.1: Create 5 CSS vibe theme files
  - `base.css` — Shared variables & animations
  - `lofi.css` — 🌙 Calm study aesthetic (dark indigo + purple)
  - `hype.css` — ⚡ High energy (electric blue + neon)
  - `focus.css` — 🔥 Minimal distraction-free (dark + amber)
  - `chill.css` — 🌿 Earthy relaxed (forest green)
  - `midnight.css` — 🌌 Deep moody (purple + mystical)

- [x] 1.2: Create vibeUtils.ts for theme loading
- [x] 1.3: Create VibePicker React component with full styling
- [x] 1.4: Implement dynamic theme injection in App.tsx and ChatRoom.tsx
- [x] 1.5: Integrate VibePicker into RoomSidebar room creation modal

**Success Criteria — ALL MET:**
- [x] Create room with vibe → theme applies instantly ✓
- [x] Switch rooms → theme changes dynamically ✓
- [x] Preference persists in localStorage ✓
- [x] Build passes with no errors ✓

### Phase 2: 🔄 PENDING (8-10 hours)
- [ ] 2.1: Time Capsule Messages (sealedUntil field + UI)
- [ ] 2.2: Ephemeral Rooms (expiresAt + countdown + Cloud Function)
- [ ] 2.3: Per-Message Translate button
- [ ] 2.4: Tone Rewriter preview (Before/After)

### Phase 3: 🎯 PENDING (12-15 hours)
- [ ] 3.1: Message Vault (star → search)
- [ ] 3.2: Creator Channels (Stripe integration)
- [ ] 3.3: Geofenced Rooms (location-based discovery)

---

## Troubleshooting

### Build fails with "vibe does not exist in type"
**Solution**: Run `npm run build` in frontend directory to refresh TypeScript cache

### Gemini API errors
**Check**:
1. API key is set in `.env.local` correctly
2. Visit https://aistudio.google.com to verify key is active
3. Check quota hasn't been exceeded

### Firestore rules error on deployment
**Solution**: Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### Backend not connecting to Firestore
**Check**:
1. `serviceAccountKey.json` exists in `backend/server/`
2. Firebase environment variables are set in Vercel
3. Firestore project ID matches firebase.json

---

## References

- **Firebase Docs**: https://firebase.google.com/docs
- **Gemini API**: https://ai.google.dev
- **Firestore Rules**: See `firestore.rules`
- **Backend Routes**: `backend/server/src/modules/*/routes/`
- **Component Library**: `frontend/src/features/*/components/`

---

**Questions?** Check the implementation roadmap in `/memories/session/plan.md`
