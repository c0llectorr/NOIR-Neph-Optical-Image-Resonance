import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SongReview } from '../types';

export const saveSongReview = async (userId: string, review: Omit<SongReview, 'timestamp'>) => {
  const reviewRef = doc(db, `users/${userId}/reviews`, review.songId);
  
  // Clean undefined values
  const cleanReview = Object.fromEntries(
    Object.entries(review).filter(([_, v]) => v !== undefined)
  );
  
  await setDoc(reviewRef, {
    ...cleanReview,
    timestamp: serverTimestamp()
  }, { merge: true }); // Merge so we don't overwrite if they just want to comment or just like
};
