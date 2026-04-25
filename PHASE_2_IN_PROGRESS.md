# Phase 2: Time Capsule Messages + Ephemeral Rooms + Translation UX

**Status**: IN PROGRESS ⏳  
**Start Date**: April 23, 2026  
**Estimated Duration**: 8-10 hours  

---

## 2.1 Time Capsule Messages (Sealed Messages) 🔒

### Overview
Messages can be "sealed" until a future date/time, appearing blurred/hidden until the seal date arrives.

### Implementation Tasks

#### ✅ 2.1.1 Message Type Extensions
**File**: `frontend/src/core/shared/types/chat.ts`

Add to message interface:
```typescript
interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: Timestamp
  mood?: string
  ttl?: number
  isEphemeral?: boolean
  
  // NEW for Time Capsule
  sealedUntil?: Timestamp | null    // When message becomes visible
  isSealed?: boolean                 // Cached boolean for faster checks
}
```

**Status**: Type already defined in CONTEXT.md (ready for implementation)

#### 2.1.2 MessageInput Component Enhancement
**File**: `frontend/src/features/chat/components/MessageInput.tsx`

Add "Seal Until..." button and modal:
- Show button next to send button (🔒 Seal)
- On click, open date/time picker
- Options: 1 day, 1 week, 1 month, custom date
- Display preview: "Message will be sealed until [date]"
- Pass `sealedUntil` to message object before sending

**Implementation Steps**:
1. Create SealMessageModal.tsx component
2. Add state for seal duration
3. Update message sending logic to include sealedUntil
4. Style the seal button and modal

#### 2.1.3 MessageList Display Logic
**File**: `frontend/src/features/chat/components/MessageList.tsx`

Render sealed vs. unsealed messages:
```typescript
const isSealed = message.sealedUntil && new Date(message.sealedUntil) > new Date();

if (isSealed) {
  return <SealedMessageBubble message={message} />;
}
return <MessageBubble message={message} />;
```

**SealedMessageBubble component**:
- Blur effect (backdrop-filter: blur(8px))
- Lock icon 🔒
- Countdown timer (e.g., "Unseals in 6 hours, 23 minutes")
- Smooth animations

#### 2.1.4 Countdown and Auto-Unsealing
**File**: Create `frontend/src/features/chat/utils/sealUtils.ts`

Functions:
- `getTimeRemaining(sealedUntil): string` - Format remaining time
- `isMessageSealed(message): boolean` - Check if sealed
- `formatUnsealTime(date): string` - Format "May 24 at 2:30 PM"

Real-time updates:
- Use React interval hook to update countdown every 10 seconds
- When countdown reaches zero, trigger unsealing animation
- Switch from SealedMessageBubble to normal MessageBubble
- Show celebration animation (optional: confetti or particle effect)

#### 2.1.5 Unsealing Animation
**File**: `frontend/src/features/chat/components/SealedMessageBubble.tsx`

CSS animation when unsealing:
```css
@keyframes unseal {
  0% {
    opacity: 0.3;
    filter: blur(8px);
  }
  50% {
    opacity: 0.7;
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    filter: blur(0);
  }
}

.message-unsealing {
  animation: unseal 0.8s ease-out;
}
```

Optional: Confetti particle animation via `react-confetti` library.

---

## 2.2 Ephemeral Rooms (Self-Destructing) ⏱️

### Overview
Rooms can be set to auto-delete after a specified duration (1 hour, 6 hours, 24 hours, or custom).

### Implementation Tasks

#### ✅ 2.2.1 Room Type Extensions
**File**: `frontend/src/core/shared/api/chatApi.ts`

Already done in Phase 1:
```typescript
interface RoomCreationOptions {
  // ... existing fields
  expiresAt?: Date | string | null
}
```

Also in Firestore schema (from CONTEXT.md):
```typescript
interface ChatRoom {
  // ... existing fields
  expiresAt?: Timestamp | null  // When room auto-deletes
  autoDelete?: boolean
}
```

**Status**: Type definitions complete, ready for UI

#### 2.2.2 Room Creation Modal Update
**File**: `frontend/src/features/rooms/components/RoomSidebar.tsx`

Already has ephemeral-toggle in create modal. Need to verify functionality:
- Toggle for "Self-Destruct this room"
- Options: 1 hour, 6 hours, 24 hours, 48 hours
- Calculate `expiresAt = now + duration`
- Pass to createRoom() API

**Status**: HTML structure exists (lines 680+), needs event handlers

#### 2.2.3 Countdown Display in Room Header
**File**: `frontend/src/features/chat/components/ChatRoom.tsx`

Add header element:
```typescript
if (room.expiresAt) {
  const timeRemaining = getTimeRemaining(room.expiresAt);
  return (
    <div className="room-countdown-banner">
      <Timer size={16} />
      <span>This room expires in {timeRemaining}</span>
    </div>
  );
}
```

Styling: Red/amber banner with icon and countdown timer.

#### 2.2.4 Cloud Function for Auto-Deletion
**File**: `backend/functions/src/index.ts`

Create scheduled Cloud Function:
```typescript
export const deleteExpiredRooms = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    const expiredRooms = await admin.firestore()
      .collection('chatRooms')
      .where('expiresAt', '<', now)
      .where('autoDelete', '==', true)
      .get();
    
    for (const roomDoc of expiredRooms.docs) {
      // Delete room, messages, subcollections
      await deleteRoomCascade(roomDoc.id);
    }
  });

async function deleteRoomCascade(roomId: string) {
  const batch = admin.firestore().batch();
  
  // Delete all messages
  const messages = await admin.firestore()
    .collection('chatRooms')
    .doc(roomId)
    .collection('messages')
    .get();
  
  messages.docs.forEach((doc) => batch.delete(doc.ref));
  
  // Delete room
  batch.delete(
    admin.firestore().collection('chatRooms').doc(roomId)
  );
  
  await batch.commit();
}
```

#### 2.2.5 Client-Side Deletion Listener
**File**: `frontend/src/features/chat/components/ChatRoom.tsx`

Add useEffect to monitor expiry:
```typescript
useEffect(() => {
  if (!room.expiresAt) return;
  
  const checkExpiry = setInterval(() => {
    if (new Date(room.expiresAt) <= new Date()) {
      showNotification("This room has expired and been deleted");
      navigate('/rooms'); // Redirect to room list
    }
  }, 10000); // Check every 10 seconds
  
  return () => clearInterval(checkExpiry);
}, [room.expiresAt]);
```

---

## 2.3 Enhanced Translation UI 🌐

### Overview
Add per-message translation button with one-click translation display.

### Implementation Tasks

#### 2.3.1 Message Bubble Translation Button
**File**: `frontend/src/features/chat/components/MessageBubble.tsx` or `MessageList.tsx`

Add 🌐 translate button (visible on hover):
- Button text: "Translate"
- On click: Call Gemini API with message text + user's preferred language
- Show loading state (spinner)
- Display translation below original message
- Toggle "Show Original" / "Show Translation"

**Status**: Room-level translation toggle exists, need per-message button

#### 2.3.2 Translation Caching
**File**: Create `frontend/src/features/chat/utils/translationCache.ts`

Cache translations to avoid redundant API calls:
```typescript
interface TranslationCache {
  [messageId: string]: {
    original: string
    translations: {
      [language: string]: string
    }
    timestamp: number
  }
}

export const translationCache: TranslationCache = {};

export function getCachedTranslation(messageId: string, language: string): string | null {
  const cached = translationCache[messageId];
  return cached?.translations[language] || null;
}

export function cacheTranslation(messageId: string, language: string, translation: string) {
  if (!translationCache[messageId]) {
    translationCache[messageId] = {
      original: '',
      translations: {},
      timestamp: Date.now()
    };
  }
  translationCache[messageId].translations[language] = translation;
}
```

#### 2.3.3 Gemini Translation Call
**File**: `frontend/src/core/shared/api/geminiService.ts`

Add function:
```typescript
export async function translateMessage(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto'
): Promise<string> {
  const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else.\n\n${text}`;
  
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}
```

#### 2.3.4 Per-Message Translation Modal
**File**: Create `frontend/src/features/chat/components/TranslationModal.tsx`

UI:
- Original message in left column
- Translated message in right column
- Language selector dropdown
- Copy translation button
- Close button

---

## 2.4 Improved Tone Rewriter UX ✍️

### Overview
Enhance existing tone rewriter with Before/After preview and loading states.

### Implementation Tasks

#### 2.4.1 Tone Rewriter Preview
**File**: `frontend/src/features/chat/components/ToneRewriterModal.tsx` (new component)

Currently in MessageInput.tsx as buttons. Extract to modal:
- Show original message
- Show rewritten preview
- 5 tone options: Professional, Friendly, Shorter, Direct, Casual
- Accept/Reject buttons
- Custom instruction input field

#### 2.4.2 Loading State
Add spinner while Gemini processes:
```tsx
<div className="tone-loading">
  <Spinner />
  <p>Rewriting message...</p>
</div>
```

#### 2.4.3 Fallback Handling
If Gemini API fails:
- Show error message
- Provide "Try Again" button
- Option to manually edit message

---

## Implementation Priority

1. **2.1 Time Capsule Messages** (4 hours)
   - Type extensions ✓
   - MessageInput seal button
   - SealedMessageBubble component
   - Countdown + unsealing logic

2. **2.2 Ephemeral Rooms** (3 hours)
   - Room creation modal handlers
   - ChatRoom countdown display
   - Cloud Function for auto-deletion

3. **2.3 & 2.4 Translation/Tone Rewriter** (2 hours)
   - Per-message translate button
   - Tone rewriter modal extraction
   - Loading states

---

## Testing Checklist

- [ ] Create message, seal for tomorrow, verify blur + countdown
- [ ] Wait for or manually trigger unsealing, verify animation
- [ ] Create ephemeral room with 1-minute expiry, watch countdown
- [ ] Verify room deletion via Cloud Function
- [ ] Test per-message translate, verify translation appears
- [ ] Test tone rewriter with all 5 tones
- [ ] `npm run build` passes with zero errors

