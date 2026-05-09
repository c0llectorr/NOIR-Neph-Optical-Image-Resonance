# Security Specification for Noir

## Data Invariants
1. A user profile (`users/{userId}`) must have a unique `username` registered in `usernames/{username}`.
2. A user can only manage their own sub-collections (`likes`, `reviews`, `curations`, `feedback`).
3. `usernames` is a unique index where the document ID is the username and it contains the `uid`.
4. App reviews (`reviews/{reviewId}`) are public but only the author can edit/delete them.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create `users/victim_uid` with `request.auth.uid = attacker_uid`.
2. **Username Hijack**: Attempt to create `usernames/taken_user` for a different `uid`.
3. **Ghost Fields**: Attempt to add `isAdmin: true` to a user profile.
4. **Invalid Rating**: Submitting a feedback rating of `6` or `-1`.
5. **PII Breach**: Unauthenticated user trying to read `users/{userId}`.
6. **Orphaned Like**: Creating a like for a song without a valid user session.
7. **Timestamp Fraud**: Setting `createdAt` to a date in the future.
8. **Malicious Curation**: Injecting a 1MB string into a curation title.
9. **Duplicate Username**: Creating a user profile with a username that doesn't match the one in `usernames`.
10. **Unauthorized Review Deletion**: User A trying to delete User B's app review.
11. **Type Poisoning**: Sending an object where a string is expected in `dob`.
12. **Status Bypass**: Manually setting `profileCompleted: true` without required fields.

## Test Runner (Success/Fail Scenarios)
The `firestore.rules.test.ts` will verify these boundaries.
