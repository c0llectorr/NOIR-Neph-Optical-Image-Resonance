import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export const RegistrationForm: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
  });

  // Pre-fill from Google if available
  React.useEffect(() => {
    if (user && user.providerData.some(p => p.providerId === 'google.com')) {
      const displayName = user.displayName || '';
      const nameParts = displayName.split(' ');
      const first = nameParts[0] || '';
      const last = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || first,
        lastName: prev.lastName || last,
      }));
    }
  }, [user]);

  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    
    // Permissive check to allow characters but keep them lowercase for doc IDs
    const regex = /^[a-z0-9._\-\s]+$/;
    if (username.length > 0 && !regex.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    // Local session cache to prevent re-checking known usernames
    const sessionCacheKey = `checks_${username}`;
    const cached = sessionStorage.getItem(sessionCacheKey);
    if (cached) {
      setUsernameStatus(cached as any);
      return;
    }

    if (localStorage.getItem('quota_exceeded_timestamp')) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    try {
      const usernameRef = doc(db, 'usernames', username);
      const docSnap = await getDoc(usernameRef);
      
      const result = !docSnap.exists() ? 'available' : 'taken';
      setUsernameStatus(result);
      sessionStorage.setItem(sessionCacheKey, result);
    } catch (err: any) {
      console.error("Username check failed:", err);
      // Don't throw here to prevent crashing the effect, just set back to idle or show error
      setUsernameStatus('idle');
      if (err.message?.toLowerCase().includes('quota')) {
        alert("System quota exceeded. Please wait a moment or check your Firebase console.");
      }
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    setFormData(prev => ({ ...prev, username: val }));
  };

  // Debounced username check
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkUsername(formData.username);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!user) return;
    if (usernameStatus !== 'available') return;
    
    if (!formData.firstName || !formData.lastName) {
        alert("Please fill all required fields.");
        return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Create username registry entry
      const usernameRef = doc(db, 'usernames', formData.username);
      batch.set(usernameRef, {
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      // 2. Create user profile
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, {
        ...formData,
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        profileCompleted: true,
        onboardingComplete: false,
        dob: '',
        gender: 'prefer-not-to-say'
      });

      await batch.commit();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid} / usernames/${formData.username}`);
      alert(`Registration failed. Check console for details.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-noir-bg relative px-6 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-noir-teal/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-noir-rust/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <span className="text-4xl font-display font-extrabold text-noir-gold tracking-tightest">NOIR</span>
            <div className="w-2.5 h-2.5 rounded-full bg-noir-rust shadow-[0_0_15px_rgba(181,58,24,0.8)] ml-1 mb-1" />
          </div>
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <Sparkles size={12} className="text-noir-gold" />
            <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.3em]">Initialize Identity</span>
          </div>
        </div>

        <div className="noir-card p-8 border-white/5 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
            {/* Progress indicator */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${(step / 2) * 100}%` }}
                    className="h-full bg-noir-gold"
                />
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 pt-2"
                >
                    <div className="space-y-4">
                      <div className="text-center mb-6">
                        <h2 className="text-lg font-display font-black text-white uppercase tracking-tighter">Claim Your Alias</h2>
                        <p className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em] mt-1">Unique alphanumeric identifier</p>
                      </div>
                      
                      <div className="relative group">
                        <div className="absolute top-3 left-5 text-[8px] font-black text-white/40 uppercase tracking-widest group-focus-within:text-noir-gold transition-colors z-10 pointer-events-none">Alias</div>
                        <User size={16} className="absolute left-5 top-[34px] text-white/20 group-focus-within:text-noir-gold transition-colors" />
                        <input
                          type="text"
                          value={formData.username}
                          onChange={handleUsernameChange}
                          placeholder="alias"
                          className="w-full h-20 bg-[#0A2016]/60 backdrop-blur-md border border-white/[0.05] rounded-[24px] pl-14 pr-12 text-white font-bold focus:outline-none focus:border-noir-gold/40 transition-all font-mono text-[16px] tracking-widest placeholder:text-white/5 pt-4"
                        />
                        <div className="absolute right-5 top-[34px]">
                          {usernameStatus === 'available' && <CheckCircle2 size={18} className="text-noir-teal" />}
                          {usernameStatus === 'taken' && <AlertCircle size={18} className="text-noir-rust" />}
                          {usernameStatus === 'invalid' && <AlertCircle size={18} className="text-orange-500/50" />}
                          {usernameStatus === 'checking' && <div className="w-5 h-5 border-2 border-white/10 border-t-noir-gold rounded-full animate-spin" />}
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {usernameStatus === 'taken' && (
                          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-noir-rust font-bold uppercase tracking-wider text-center">Alias Already Encoded</motion.p>
                        )}
                        {usernameStatus === 'invalid' && (
                          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-white/20 font-mono uppercase tracking-tighter text-center">Letters, numbers, dots, and spaces allowed</motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={nextStep}
                      disabled={usernameStatus !== 'available'}
                      className="w-full h-16 bg-white text-black font-black uppercase italic tracking-tighter rounded-[24px] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-20 shadow-[0_20px_40px_rgba(255,255,255,0.05)] mt-4"
                    >
                      Continue <ArrowRight size={20} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 pt-2"
                  >
                    <div className="text-center mb-6">
                      <h2 className="text-lg font-display font-black text-white uppercase tracking-tighter">Verify Persona</h2>
                      <p className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em] mt-1">Pre-filled from encrypted sync</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <div className="absolute top-2.5 left-4 text-[7px] font-black text-white/40 uppercase tracking-widest group-focus-within:text-noir-gold transition-colors z-10 pointer-events-none">First</div>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full h-16 bg-[#0A2016]/40 border border-white/[0.05] rounded-2xl px-4 pt-4 text-white text-[15px] focus:outline-none focus:border-noir-gold/40 font-bold"
                          placeholder="First"
                        />
                      </div>
                      <div className="relative group">
                        <div className="absolute top-2.5 left-4 text-[7px] font-black text-white/40 uppercase tracking-widest group-focus-within:text-noir-gold transition-colors z-10 pointer-events-none">Last</div>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full h-16 bg-[#0A2016]/40 border border-white/[0.05] rounded-2xl px-4 pt-4 text-white text-[15px] focus:outline-none focus:border-noir-gold/40 font-bold"
                          placeholder="Last"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={prevStep}
                        className="h-16 px-6 bg-white/5 border border-white/10 text-white font-bold rounded-[24px] active:scale-95 transition-all text-[10px] uppercase tracking-widest"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.firstName || !formData.lastName}
                        className="flex-1 h-16 bg-noir-gold text-black font-black uppercase tracking-tighter rounded-[24px] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-20 shadow-[0_20px_40px_rgba(242,153,0,0.15)]"
                      >
                        {isSaving ? (
                          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            Finish Setup
                            <ArrowRight size={20} />
                          </>
                        )}
                      </button>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
