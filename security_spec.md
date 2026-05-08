# Firebase Security Specification

## 1. Data Invariants
- A `User` profile must be created by the authenticated user and match their UID.
- A `SongRecommendation` (Like) must belong to the user who liked it.
- A `SongReview` must belong to the user who created it and must contain a valid `userId` and `songId`.
- `usernames` must be unique and tied to a single `uid`.
- Timestamps (`createdAt`, `updatedAt`, `timestamp`) must use server time.

## 2. The "Dirty Dozen" Payloads

### P1: Identity Spoofing (User)
**Target:** `users/attacker_uid`
**Payload:** `{ "uid": "victim_uid", "email": "attacker@example.com", ... }`
**Expected:** `PERMISSION_DENIED` (User UID must match document path and auth UID).

### P2: Identity Spoofing (Review)
**Target:** `users/victim_uid/reviews/song_1`
**Payload:** `{ "userId": "victim_uid", "songId": "song_1", ... }`
**Expected:** `PERMISSION_DENIED` (Only the owner can write to their own subcollection).

### P3: Field Injection (User)
**Target:** `users/user_uid`
**Payload:** `{ ..., "role": "admin", "isVerified": true }`
**Expected:** `PERMISSION_DENIED` (Shadow fields not allowed in User schema).

### P4: Value Poisoning (Review Comment)
**Target:** `users/user_uid/reviews/song_1`
**Payload:** `{ ..., "comment": "A".repeat(1001) }`
**Expected:** `PERMISSION_DENIED` (Comment size limit exceeded).

### P5: Resource Poisoning (Review ID)
**Target:** `users/user_uid/reviews/` + "JUNK".repeat(100)
**Payload:** `{ ... }`
**Expected:** `PERMISSION_DENIED` (ID exceeds size limit or fails regex).

### P6: Timestamp Spoofing (Review)
**Target:** `users/user_uid/reviews/song_1`
**Payload:** `{ ..., "timestamp": "2000-01-01T00:00:00Z" }`
**Expected:** `PERMISSION_DENIED` (Must use `serverTimestamp()`).

### P7: Outcome Manipulation (Review Like Status)
**Target:** `users/user_uid/reviews/song_1`
**Action:** Update `isLiked` after it was set.
**Expected:** `PERMISSION_DENIED` (If rules restricted terminal states, but here we allow updates, however we must verify it's the owner).

### P8: Orphaned Write (User without Username)
**Target:** `users/user_uid`
**Payload:** `{ "uid": "user_uid", "username": "non_existent_username", ... }`
**Expected:** `PERMISSION_DENIED` (`existsAfter` check for username reservation).

### P9: PII Leak (User Profiling)
**Target:** `users/victim_uid`
**Operation:** `get` by non-owner.
**Expected:** `PERMISSION_DENIED` (Only owners or admins can read profiles).

### P10: List Scraping (Likes)
**Target:** `users/victim_uid/likes`
**Operation:** `list` by non-owner.
**Expected:** `PERMISSION_DENIED`.

### P11: State Shortcutting (Onboarding)
**Target:** `users/user_uid`
**Payload:** Update `onboardingComplete` without required fields.
**Expected:** `PERMISSION_DENIED`.

### P12: Shadow Field Update (Review)
**Target:** `users/user_uid/reviews/song_1`
**Payload:** `{ "comment": "Nice", "hidden_flag": true }`
**Expected:** `PERMISSION_DENIED` (Update must restrict affected keys).
