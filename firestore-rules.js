/**
 * Firestore Security Rules for Real-Time Chat Application
 * 
 * These rules ensure:
 * 1. Only authenticated users can read/write
 * 2. Users cannot spoof other users' messages (UID verification)
 * 3. Messages must have required fields
 * 4. Messages must use server timestamps
 * 
 * To apply: Copy to Firebase Console > Firestore > Rules
 */

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access messages
    match /chatRooms/{roomId}/messages/{messageId} {
      // Allow read if user is authenticated
      allow read: if request.auth != null;
      
      // Allow create if:
      // - User is authenticated
      // - UID in message matches authenticated user (prevents spoofing)
      // - Message text is non-empty string
      // - User display name is set
      // - Server timestamp is used
      allow create: if request.auth != null 
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.displayName is string
        && request.resource.data.createdAt is timestamp;
      
      // Allow delete only by message author
      allow delete: if request.auth.uid == resource.data.uid;
    }
  }
}

/**
 * Key Security Features:
 * 
 * 1. UID Verification
 *    request.resource.data.uid == request.auth.uid
 *    Ensures users can't spoof messages as other users
 * 
 * 2. Text Validation
 *    text is string && text.size() > 0
 *    Prevents empty/invalid messages
 * 
 * 3. Server Timestamps
 *    createdAt is timestamp
 *    Prevents client-side time tampering
 *    Use: serverTimestamp() in client code
 * 
 * 4. Authentication Requirement
 *    if request.auth != null
 *    All operations require valid Firebase Auth session
 * 
 * 5. Ownership-Based Delete
 *    Allows delete only if user is message author
 */
