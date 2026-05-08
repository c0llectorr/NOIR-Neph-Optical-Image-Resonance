import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, getDocs, where, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import firebaseConfig from '../../firebase-applet-config.json';
import { useAuth } from './AuthContext';
import { ProcessingResult, SongRecommendation, SongReview } from '../types';

interface UserContentContextType {
  curations: ProcessingResult[];
  likedSongs: SongRecommendation[];
  reviewCount: number;
  loadingCurations: boolean;
  loadingLikes: boolean;
  quotaExceeded: boolean;
  isOffline: boolean;
  toggleLike: (song: SongRecommendation) => Promise<void>;
  addReview: (review: Omit<SongReview, 'timestamp' | 'userId'>) => Promise<void>;
  refreshCurations: () => void;
}

const UserContentContext = createContext<UserContentContextType | undefined>(undefined);

export const UserContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, reportError } = useAuth();
  
  // Use a helper to get initial state from localStorage
  const getInitialState = (key: string, defaultValue: any) => {
    if (!user) return defaultValue;
    try {
      const saved = localStorage.getItem(`cache_${user.uid}_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [curations, setCurations] = useState<ProcessingResult[]>(() => getInitialState('curations', []));
  const [likedSongs, setLikedSongs] = useState<SongRecommendation[]>(() => getInitialState('likes', []));
  const [reviewCount, setReviewCount] = useState<number>(() => getInitialState('reviewCount', 0));
  
  const [loadingCurations, setLoadingCurations] = useState(true);
  const [loadingLikes, setLoadingLikes] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(() => {
    const saved = localStorage.getItem('quota_exceeded_timestamp');
    if (saved) {
      const timestamp = parseInt(saved, 10);
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) {
        return true;
      }
      localStorage.removeItem('quota_exceeded_timestamp');
    }
    return false;
  });

  // Background Sync Check for Pending Content
  const syncPendingContent = useCallback(async () => {
    if (!user || !userData || quotaExceeded || !navigator.onLine) return;
    
    // 1. Sync Reviews
    const reviewsKey = `cache_${user.uid}_reviews_pending`;
    const pendingReviews = JSON.parse(localStorage.getItem(reviewsKey) || '[]');
    
    if (pendingReviews.length > 0) {
      console.log(`Syncing ${pendingReviews.length} pending reviews...`);
      for (const review of [...pendingReviews]) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'reviews', review.songId), {
            ...review,
            timestamp: serverTimestamp()
          }, { merge: true });
          
          const current = JSON.parse(localStorage.getItem(reviewsKey) || '[]');
          const filtered = current.filter((r: any) => r.songId !== review.songId);
          localStorage.setItem(reviewsKey, JSON.stringify(filtered));
        } catch (err: any) {
          if (err.code === 'resource-exhausted') {
            handleQuotaError();
            break;
          }
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/reviews/${review.songId}`);
        }
      }
    }

    // 2. Sync Likes
    const likesKey = `cache_${user.uid}_likes_pending`;
    const pendingLikes = JSON.parse(localStorage.getItem(likesKey) || '[]');
    
    if (pendingLikes.length > 0) {
      console.log(`Syncing ${pendingLikes.length} pending likes...`);
      for (const pending of [...pendingLikes]) {
        try {
          const likeDocRef = doc(db, 'users', user.uid, 'likes', pending.songId);
          if (pending.type === 'add') {
            await setDoc(likeDocRef, pending.data);
          } else {
            await deleteDoc(likeDocRef);
          }
          const current = JSON.parse(localStorage.getItem(likesKey) || '[]');
          const filtered = current.filter((l: any) => l.songId !== pending.songId);
          localStorage.setItem(likesKey, JSON.stringify(filtered));
        } catch (err: any) {
          if (err.code === 'resource-exhausted') {
            handleQuotaError();
            break;
          }
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/likes/${pending.songId}`);
        }
      }
    }
  }, [user, quotaExceeded]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncPendingContent();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingContent]);

  useEffect(() => {
    if (user && !quotaExceeded && !isOffline) {
      syncPendingContent();
    }
  }, [user, quotaExceeded, isOffline, syncPendingContent]);

  // Project Change Detection - Resets everything if the backend ID changes
  useEffect(() => {
    const currentProjectId = (firebaseConfig as any).projectId;
    const storedProjectId = localStorage.getItem('last_project_id');
    
    if (storedProjectId && storedProjectId !== currentProjectId) {
      console.log("Detecting Firebase project switch. Resetting cache...");
      
      const keysToClear = [
        'quota_exceeded_timestamp',
        'last_sync_timestamp',
        'last_auth_sync',
        'auth_user_data'
      ];
      
      keysToClear.forEach(k => localStorage.removeItem(k));
      
      // Clear all user-specific caches
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
      
      localStorage.setItem('last_project_id', currentProjectId);
      // We don't necessarily need to reload here as this runs at top level, 
      // but it helps clear memory state
      setQuotaExceeded(false);
      setCurations([]);
      setLikedSongs([]);
    } else {
      localStorage.setItem('last_project_id', currentProjectId);
    }
  }, []);

  // Helper to persist to localStorage
  const persist = (key: string, data: any) => {
    if (!user) return;
    try {
      localStorage.setItem(`cache_${user.uid}_${key}`, JSON.stringify(data));
      localStorage.setItem(`cache_${user.uid}_${key}_timestamp`, Date.now().toString());
      setQuotaExceeded(false);
      localStorage.removeItem('quota_exceeded_timestamp');
    } catch (e) {
      console.warn("Cache write failed:", e);
    }
  };

  const handleQuotaError = () => {
    setQuotaExceeded(true);
    localStorage.setItem('quota_exceeded_timestamp', Date.now().toString());
  };

  // Helper to check if a specific key is stale (6 hours)
  const isKeyStale = (key: string) => {
    if (!user) return true;
    const saved = localStorage.getItem(`cache_${user.uid}_${key}_timestamp`);
    if (!saved) return true;
    return Date.now() - parseInt(saved, 10) > 6 * 60 * 60 * 1000;
  };

  // 1. Curations fetching
  useEffect(() => {
    if (!user) {
      setCurations([]);
      setLoadingCurations(false);
      return;
    }

    // Use cached data first, but ONLY skip listener if quota exceeded OR data exists and is very fresh
    // We reduced the "fresh" threshold to 1 hour for better UX while still saving some quota
    const freshThreshold = 60 * 60 * 1000; 
    const lastSync = localStorage.getItem(`cache_${user.uid}_curations_timestamp`);
    const isVeryFresh = lastSync && (Date.now() - parseInt(lastSync, 10) < freshThreshold);

    if (quotaExceeded || (curations.length > 0 && isVeryFresh)) {
      setLoadingCurations(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'curations'), 
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProcessingResult));
      setCurations(data);
      persist('curations', data);
      setLoadingCurations(false);
    }, (err) => {
      console.error("Global Curations Error:", err);
      if (err.code === 'resource-exhausted') {
        handleQuotaError();
      } else {
        try {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}/curations`);
        } catch (e) {
          reportError(err.message);
        }
      }
      setLoadingCurations(false);
    });

    return () => unsubscribe();
  }, [user, quotaExceeded]);

  // 2. Likes fetching
  useEffect(() => {
    if (!user) {
      setLikedSongs([]);
      setLoadingLikes(false);
      return;
    }

    const lastSync = localStorage.getItem(`cache_${user.uid}_likes_timestamp`);
    const isVeryFresh = lastSync && (Date.now() - parseInt(lastSync, 10) < 60 * 60 * 1000);

    if (quotaExceeded || (likedSongs.length > 0 && isVeryFresh)) {
      setLoadingLikes(false);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'likes'), orderBy('likedAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const songs = snapshot.docs.map(doc => doc.data() as SongRecommendation);
      setLikedSongs(songs);
      persist('likes', songs);
      setLoadingLikes(false);
    }, (err) => {
      console.error("Global Likes Error:", err);
      if (err.code === 'resource-exhausted') {
        handleQuotaError();
      } else {
        try {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}/likes`);
        } catch (e) {
          reportError(err.message);
        }
      }
      setLoadingLikes(false);
    });

    return () => unsubscribe();
  }, [user, quotaExceeded]);

  // 3. Reviews Count - Real-time listener
  useEffect(() => {
    if (!user) {
      setReviewCount(0);
      return;
    }

    // In quota mode, we skip listening to save resources
    if (quotaExceeded) return;

    const reviewsRef = collection(db, 'users', user.uid, 'reviews');
    
    // We use onSnapshot to ensure real-time updates when reviews are added/removed
    const unsubscribe = onSnapshot(reviewsRef, (snapshot) => {
      const count = snapshot.size;
      setReviewCount(count);
      persist('reviewCount', count);
    }, (err) => {
      console.warn("Could not sync review count:", err);
      if (err.code === 'resource-exhausted') {
        handleQuotaError();
      }
    });

    return () => unsubscribe();
  }, [user, quotaExceeded]);

  const addReview = useCallback(async (review: Omit<SongReview, 'timestamp' | 'userId'>) => {
    if (!user) return;

    // Fallback values to satisfy strict security rules
    const { songTitle, artist, albumArt, comment, ...restReview } = review;
    const reviewData = {
      ...restReview,
      songTitle: songTitle || 'Unknown Title',
      artist: artist || 'Unknown Artist',
      albumArt: albumArt || '',
      comment: comment || '',
      userId: user.uid,
      timestamp: new Date().toISOString()
    };

    // 1. Optimistic Progress - Save to Local Storage immediately
    const reviewsKey = `cache_${user.uid}_reviews_pending`;
    const pendingReviews = JSON.parse(localStorage.getItem(reviewsKey) || '[]');
    const updatedPending = [reviewData, ...pendingReviews.filter((r: any) => r.songId !== review.songId)];
    localStorage.setItem(reviewsKey, JSON.stringify(updatedPending));

    // 2. Sync to Firestore in background
    if (isOffline || quotaExceeded || !userData) return;

    console.log(`[UserContentContext] Attempting to sync review for ${review.songId} to Firestore.`, reviewData);

    try {
      const { timestamp, ...rest } = reviewData;
      await setDoc(doc(db, 'users', user.uid, 'reviews', review.songId), {
        ...rest,
        timestamp: serverTimestamp()
      }, { merge: true });
      
      // Remove from pending once synced
      const currentPending = JSON.parse(localStorage.getItem(reviewsKey) || '[]');
      const filtered = currentPending.filter((r: any) => r.songId !== review.songId);
      localStorage.setItem(reviewsKey, JSON.stringify(filtered));
    } catch (err: any) {
      console.warn("Review sync failed:", err);
      if (err.code === 'resource-exhausted') {
        handleQuotaError();
      } else {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/reviews/${review.songId}`);
      }
    }
  }, [user, isOffline, quotaExceeded]);

  const toggleLike = useCallback(async (song: SongRecommendation) => {
    if (!user || !song.id) return;
    
    const songId = song.id;
    const isLiked = likedSongs.some(s => s.id === songId);
    const becomingLiked = !isLiked;

    // 1. Optimistic Update for Liked List
    const newLikedSongs = isLiked 
      ? likedSongs.filter(s => s.id !== songId)
      : [{ ...song, likedAt: new Date().toISOString() }, ...likedSongs];
    
    setLikedSongs(newLikedSongs);
    persist('likes', newLikedSongs);

    // 2. Queue for Sync
    const likesKey = `cache_${user.uid}_likes_pending`;
    const pendingLikes = JSON.parse(localStorage.getItem(likesKey) || '[]');
    const newPending = [
      ...pendingLikes.filter((p: any) => p.songId !== songId),
      {
        songId,
        type: isLiked ? 'remove' : 'add',
        data: isLiked ? null : { ...song, likedAt: new Date().toISOString() },
        timestamp: Date.now()
      }
    ];
    localStorage.setItem(likesKey, JSON.stringify(newPending));

    // 3. Also update a Review record to track this interaction (Like status)
    addReview({
      songId,
      songTitle: song.title,
      artist: song.artist,
      albumArt: song.albumArt,
      isLiked: becomingLiked
    });

    if (isOffline || quotaExceeded || !userData) return;

    try {
      const likeDocRef = doc(db, 'users', user.uid, 'likes', songId);
      if (isLiked) {
        await deleteDoc(likeDocRef);
      } else {
        await setDoc(likeDocRef, {
          ...song,
          likedAt: new Date().toISOString()
        });
      }
      
      // Remove from pending if successful
      const currentPending = JSON.parse(localStorage.getItem(likesKey) || '[]');
      const filtered = currentPending.filter((l: any) => l.songId !== songId);
      localStorage.setItem(likesKey, JSON.stringify(filtered));
    } catch (err: any) {
      console.error("Firestore Like Error:", err);
      if (err.code === 'resource-exhausted') {
        handleQuotaError();
      } else {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/likes/${songId}`);
      }
    }
  }, [user, likedSongs, isOffline, quotaExceeded, addReview]);

  const refreshCurations = () => {
    setQuotaExceeded(false);
    localStorage.removeItem('quota_exceeded_timestamp');
    
    // Clear timestamps to force re-fetch
    if (user) {
      localStorage.removeItem(`cache_${user.uid}_curations_timestamp`);
      localStorage.removeItem(`cache_${user.uid}_likes_timestamp`);
      localStorage.removeItem(`cache_${user.uid}_reviewCount_timestamp`);
      localStorage.removeItem(`cache_${user.uid}_reviews_pending`);
    }
  };

  return (
    <UserContentContext.Provider value={{ 
      curations, 
      likedSongs, 
      reviewCount,
      loadingCurations, 
      loadingLikes, 
      quotaExceeded,
      isOffline,
      toggleLike,
      addReview,
      refreshCurations
    }}>
      {children}
    </UserContentContext.Provider>
  );
};

export const useUserContent = () => {
  const context = useContext(UserContentContext);
  if (context === undefined) {
    throw new Error('useUserContent must be used within a UserContentProvider');
  }
  return context;
};
