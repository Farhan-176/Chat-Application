# Firebase Functions (Cleanup)

This folder contains Cloud Function scaffolding for backend cleanup tasks.

## Included Function

- `cleanupDeletedUserData`: Triggered when a Firebase Auth user is deleted.
  - Deletes `users/{uid}`
  - Deletes user presence/typing docs in each room
  - Deletes invitation docs that match the deleted user's email
  - Attempts workspace-members cleanup (extend this as needed)
- `onRoomMemberAdded` / `onRoomMemberRemoved`: Keeps `chatRooms/{roomId}.memberCount` synchronized.
- `onMessageCreatedPush`: Sends FCM push notifications to room members on new messages.
  - Reads tokens from `users/{uid}/devices/*` where `token` exists and `notificationsEnabled !== false`
  - Auto-prunes stale/invalid tokens returned by FCM

## Usage

1. `cd functions`
2. `npm install`
3. `npm run build`
4. Deploy with Firebase CLI: `npm run deploy`

## Notes

- Extend cleanup logic for additional collections (messages, uploads metadata, audit logs) as required.
- Keep deletion operations idempotent.
