import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, UserCircle, Calendar, Instagram, Music, Info, CheckCircle2, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userData }) => {
  const { user, deleteAccount } = useAuth();
  const [formData, setFormData] = useState({
    username: userData?.username || '',
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    dob: userData?.dob || '',
    gender: userData?.gender || 'prefer-not-to-say',
    bio: userData?.bio || '',
    spotifyUrl: userData?.spotifyUrl || '',
    instagramUrl: userData?.instagramUrl || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  useEffect(() => {
    if (userData && isOpen && !isSaving) {
      setFormData({
        username: userData.username || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        dob: userData.dob || '',
        gender: userData.gender || 'prefer-not-to-say',
        bio: userData.bio || '',
        spotifyUrl: userData.spotifyUrl || '',
        instagramUrl: userData.instagramUrl || '',
      });
      setUsernameStatus('available');
    }
  }, [userData, isOpen, isSaving]);

  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    
    // More permissive regex: letters, numbers, dots, underscores, spaces and common symbols
    const regex = /^[a-z0-9._!\s@#$%^&*()\-+=]+$/;
    if (username.length > 0 && !regex.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    if (username === userData?.username) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    try {
      const usernameRef = doc(db, 'usernames', username);
      const docSnap = await getDoc(usernameRef);
      
      if (!docSnap.exists()) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    } catch (err) {
      console.error("Error checking username:", err);
      setUsernameStatus('idle');
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    setFormData(prev => ({ ...prev, username: val }));
  };

  // Debounced username check
  useEffect(() => {
    if (formData.username && formData.username !== userData?.username) {
      const timeoutId = setTimeout(() => {
        checkUsername(formData.username);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.username, userData?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return;

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      
      // If username changed, handle the registry
      if (formData.username !== userData?.username && userData?.username) {
        // 1. Delete old username
        const oldUsernameRef = doc(db, 'usernames', userData.username);
        batch.delete(oldUsernameRef);
        
        // 2. Create new username
        const newUsernameRef = doc(db, 'usernames', formData.username);
        batch.set(newUsernameRef, {
          uid: user.uid,
          createdAt: new Date()
        });
      }

      // 3. Update user profile
      batch.update(userRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
      onClose();
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      console.error("Error deleting account:", err);
      alert("Failed to delete account. You may need to sign out and sign in again to perform this sensitive operation.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">Edit Profile</h2>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] mt-1">Personalize your aesthetic</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {/* Username Section */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-[10px] font-mono font-black text-[#B13BFF] uppercase tracking-[0.2em] bg-[#B13BFF]/5 px-3 py-1 rounded-full w-fit mb-4">
              <User size={12} /> Unique Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.username}
                onChange={handleUsernameChange}
                placeholder="aesthetic_lover_88"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-white font-medium focus:outline-none focus:border-[#FFCC00]/50 transition-all pl-12"
                required
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20">@</div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                {usernameStatus === 'available' && <CheckCircle2 size={20} className="text-green-500" />}
                {usernameStatus === 'taken' && <AlertCircle size={20} className="text-red-500" />}
                {usernameStatus === 'invalid' && <AlertCircle size={20} className="text-orange-500" />}
                {usernameStatus === 'checking' && <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              </div>
            </div>
            {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 font-medium">This username is already claimed.</p>}
            {usernameStatus === 'invalid' && <p className="text-[10px] text-orange-500 font-medium">Use only letters, numbers, dots or underscores.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest pl-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-white/20"
              />
            </div>
            {/* Last Name */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest pl-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DOB */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest pl-1">
                <Calendar size={12} /> Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-white/20 [color-scheme:dark]"
              />
            </div>
            {/* Gender */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest pl-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-white/20 appearance-none bg-no-repeat bg-[right_1rem_center]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest pl-1">
              <Info size={12} /> Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              placeholder="Tell us about your vibe..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/20 resize-none"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-6 pt-4 border-t border-white/5">
            <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">Social Connectivity</h3>
            
            <div className="space-y-4">
              <div className="relative">
                <Instagram size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E1306C]" />
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagramUrl: e.target.value }))}
                  placeholder="Instagram URL"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              <div className="relative">
                <Music size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1DB954]" />
                <input
                  type="url"
                  value={formData.spotifyUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                  placeholder="Spotify Profile URL"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-10 border-t border-white/5 space-y-6 pb-4">
            <div className="flex flex-col">
              <h3 className="text-xs font-display font-bold text-red-500 uppercase tracking-wider mb-2">Danger Zone</h3>
              <p className="text-[10px] text-white/30 font-mono">Irreversible actions that affect your presence on VibeMatch.</p>
            </div>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-14 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} /> Delete My Account
              </button>
            ) : (
              <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/10 space-y-4">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="text-red-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Are you absolutely sure?</h4>
                    <p className="text-xs text-white/60 leading-relaxed">
                      All your profile data, username, and liked songs will be permanently erased. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-tighter disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : 'Yes, Delete Everything'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 h-12 rounded-xl bg-white/10 text-white font-bold text-xs uppercase tracking-tighter"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
          <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSaving || usernameStatus === 'taken' || usernameStatus === 'invalid'}
            className="h-14 px-8 bg-[#FFCC00] text-black font-black uppercase tracking-tighter rounded-2xl flex items-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.5)] active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} /> Update Profile
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
