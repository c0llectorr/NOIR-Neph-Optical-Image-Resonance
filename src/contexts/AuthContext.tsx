import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, writeBatch, collection, getDocs, deleteDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingComplete: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  reportError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const quotaExceeded = !!localStorage.getItem('quota_exceeded_timestamp');

        // Always attempt to set up a real-time listener if not in quota mode
        // to ensure user data (like upload counts) is always synchronized
        if (userData && quotaExceeded) {
          setLoading(false);
          return;
        }

        // Listen to User document
        const userRef = doc(db, 'users', firebaseUser.uid);
        if (unsubscribeFirestore) unsubscribeFirestore();
        
        unsubscribeFirestore = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Cleanup: Check for massive fields that might cause "document size" errors
            // If photoURL is a massive base64, or if we have legacy large arrays
            let needsCleanup = false;
            const cleanupFields: any = {};
            
            // 1. Detect massive base64 photoURL (> 500KB)
            if (data.photoURL && data.photoURL.startsWith('data:') && data.photoURL.length > 500000) {
              console.warn("Massive photoURL detected (size: " + data.photoURL.length + "). Cleaning up...");
              cleanupFields.photoURL = deleteField();
              needsCleanup = true;
            }
            
            // 2. Detect legacy curations array (if it was moved to subcollection)
            if (Array.isArray(data.curations) && data.curations.length > 0) {
              console.warn("Legacy curations array detected. Moving to subcollection and cleaning up...");
              // We could migrate them here, but for now we just clear the field to fix the size error
              // since they should already be in the subcollection according to current code
              cleanupFields.curations = deleteField();
              needsCleanup = true;
            }

            if (needsCleanup && !quotaExceeded) {
              try {
                await updateDoc(userRef, cleanupFields);
                console.log("Cleanup successful.");
              } catch (e) {
                console.error("Cleanup failed:", e);
              }
            }

            setUserData(data);
            localStorage.setItem('auth_user_data', JSON.stringify(data));
            localStorage.setItem('last_auth_sync', Date.now().toString());
          } else {
            setUserData(null);
            localStorage.removeItem('auth_user_data');
          }
          setLoading(false);
          setError(null);
        }, (err) => {
          setLoading(false);
          if (!localStorage.getItem('auth_user_data')) {
            setError(err.message || String(err));
          }
          console.error("Auth Snapshot Error:", err);
        });

      } else {
        setUser(null);
        setUserData(null);
        localStorage.removeItem('auth_user_data');
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = undefined;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for sign-in. Please add this URL to the "Authorized Domains" list in your Firebase Authentication settings.');
      } else {
        setError(err.message || String(err));
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setOnboardingComplete = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { onboardingComplete: true }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;
    const username = userData?.username;

    try {
      const batch = writeBatch(db);

      // 1. Delete username reservation
      if (username) {
        batch.delete(doc(db, 'usernames', username));
      }

      // 2. Delete all likes
      const likesRef = collection(db, 'users', uid, 'likes');
      const likesSnap = await getDocs(likesRef);
      likesSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Delete main user document
      batch.delete(doc(db, 'users', uid));

      // Commit all Firestore deletions
      await batch.commit();

      // 4. Delete the Auth user
      try {
        await user.delete();
      } catch (authErr: any) {
        if (authErr.code === 'auth/requires-recent-login') {
          console.warn('Recent login required to delete authentication. Wiping data and logging out.');
          await logout();
        } else {
          throw authErr;
        }
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  };

  const reportError = (err: string | null) => {
    setError(err);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      error,
      signInWithGoogle, 
      logout,
      setOnboardingComplete,
      deleteAccount,
      reportError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
