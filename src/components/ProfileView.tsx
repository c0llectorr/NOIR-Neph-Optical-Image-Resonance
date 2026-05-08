import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Pencil, LogOut, ChevronRight, Instagram, Music, Trash2, Camera, X } from 'lucide-react';
import { doc, getDoc, writeBatch, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserContent } from '../contexts/UserContentContext';
import { UserReviews } from './UserReviews';
import { resizeImage } from '../lib/imageUtils';

interface ProfileViewProps {
  userData: any;
  user: any;
  logout: () => void;
  setActiveTab?: (tab: 'home' | 'songs' | 'insights' | 'liked' | 'profile') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ userData, user, logout, setActiveTab }) => {
  const { deleteAccount } = useAuth();
  const { likedSongs, reviewCount } = useUserContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingReviews, setViewingReviews] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    username: userData?.username || '',
    dob: userData?.dob || '',
    gender: userData?.gender || 'Male',
    bio: userData?.bio || '',
    instagram: userData?.instagram || '',
    spotify: userData?.spotify || '',
    photoURL: userData?.photoURL || user?.photoURL || '',
  });

  const [stats, setStats] = useState({
    uploads: userData?.totalUploads || 0,
    liked: likedSongs.length,
    reviews: reviewCount
  });

  useEffect(() => {
    setStats(prev => ({ 
      ...prev, 
      liked: likedSongs.length,
      reviews: reviewCount
    }));
  }, [likedSongs, reviewCount]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        username: userData.username || '',
        dob: userData.dob || '',
        gender: userData.gender || 'Male',
        bio: userData.bio || '',
        photoURL: userData.photoURL || user?.photoURL || '',
      }));
      setStats(prev => ({ ...prev, uploads: userData.totalUploads || 0 }));
    }
  }, [userData, user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const { instagram, spotify, ...dataToSave } = formData as any;
      await updateDoc(userRef, {
        ...dataToSave,
        updatedAt: new Date().toISOString()
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Transmission failed. Please check your connection or permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Error deleting account. You may need to log in again to perform this sensitive operation.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file, 400, 400, 0.6);
        setFormData(prev => ({ ...prev, photoURL: resized }));
      } catch (err) {
        console.error("Failed to process profile photo:", err);
        alert("Could not process image. Please try a different one.");
      }
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photoURL: '' }));
  };

  if (viewingReviews) {
    return <UserReviews userId={user.uid} onBack={() => setViewingReviews(false)} />;
  }

  return (
    <div className="min-h-screen bg-black/20 text-white pb-40 overflow-x-hidden">
      {/* Profile Header section */}
      <div className="flex flex-col items-center pt-8 mb-8">
        {/* Record Player Avatar */}
        <div className="relative mb-6">
          <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-[#0A2016] to-noir-gold/20 p-1 flex items-center justify-center relative overflow-visible">
            {/* Record grooves */}
            <div className="absolute inset-0 rounded-full border border-white/5 opacity-40 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]" />
            
            <div className="w-44 h-44 rounded-full bg-black border-[3px] border-noir-gold/20 flex items-center justify-center relative ring-1 ring-white/10">
              {/* Profile image center */}
              <div className="w-40 h-40 rounded-full border border-white/5 flex items-center justify-center overflow-hidden bg-zinc-900 shadow-2xl">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-4xl font-black text-white/5 italic">
                    {formData.firstName?.[0] || 'V'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Edit/Remove Photo */}
            <div className="absolute bottom-2 right-2 flex flex-col gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-noir-gold text-noir-bg flex items-center justify-center border-[3px] border-[#01160D] shadow-lg active:scale-90 transition-transform"
              >
                <Camera size={18} />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
          </div>
        </div>

        <h2 className="text-3xl font-display font-black text-white mb-1">
          {formData.firstName} {formData.lastName}
        </h2>
        <p className="text-white/30 text-sm font-medium mb-3">
          @{formData.username}
        </p>
        {formData.bio && (
          <p className="text-white/60 text-sm text-center px-10 leading-relaxed font-medium">
            {formData.bio}
          </p>
        )}
      </div>

      {/* Stats Bar */}
      <div className="noir-card py-6 mb-10 flex justify-between px-8 shadow-lg mx-2 border-white/[0.05]">
        <div className="text-center">
          <div className="w-14 h-14 flex items-center justify-center border border-white/5 rounded-2xl mx-auto mb-1.5 bg-white/[0.02]">
            <div className="text-noir-gold text-2xl font-black">{stats.uploads}</div>
          </div>
          <div className="text-white/20 text-[9px] uppercase font-heavy tracking-widest">Uploads</div>
        </div>

        <div className="w-[1px] bg-white/5 h-10 self-center" />

        <button 
          onClick={() => setActiveTab?.('liked')}
          className="text-center group active:scale-95 transition-all"
        >
          <div className="w-14 h-14 flex items-center justify-center border border-white/10 group-hover:border-noir-gold/40 group-hover:bg-noir-gold/5 rounded-2xl mx-auto mb-1.5 transition-all cursor-pointer">
            <div className="text-noir-gold text-2xl font-black">{stats.liked}</div>
          </div>
          <div className="text-white/20 text-[9px] uppercase font-heavy tracking-widest group-hover:text-noir-gold/60 transition-colors">Liked</div>
        </button>

        <div className="w-[1px] bg-white/5 h-10 self-center" />

        <button 
          onClick={() => setViewingReviews(true)}
          className="text-center group active:scale-95 transition-all"
        >
          <div className="w-14 h-14 flex items-center justify-center border border-white/10 group-hover:border-noir-gold/40 group-hover:bg-noir-gold/5 rounded-2xl mx-auto mb-1.5 transition-all cursor-pointer">
            <div className="text-noir-gold text-2xl font-black">{stats.reviews}</div>
          </div>
          <div className="text-white/20 text-[9px] uppercase font-heavy tracking-widest group-hover:text-noir-gold/60 transition-colors">Reviews</div>
        </button>
      </div>

      {/* Info Sections */}
      <div className="space-y-4 px-2">
        <div className="flex items-center gap-3 mb-6 px-2">
          <h3 className="text-white/30 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Identity Details</h3>
          <div className="h-[1px] bg-white/10 w-full" />
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ProfileField 
              label="First Name" 
              value={formData.firstName} 
              onChange={(val) => setFormData(prev => ({ ...prev, firstName: val }))}
            />
            <ProfileField 
              label="Last Name" 
              value={formData.lastName} 
              onChange={(val) => setFormData(prev => ({ ...prev, lastName: val }))}
            />
          </div>
          <ProfileField 
            label="Username" 
            value={`@${formData.username}`} 
            onChange={(val) => setFormData(prev => ({ ...prev, username: val.replace('@', '') }))}
          />
          <ProfileField 
            label="Date of Birth" 
            value={formData.dob} 
            type="date"
            onChange={(val) => setFormData(prev => ({ ...prev, dob: val }))}
          />
          <ProfileField 
            label="Gender" 
            value={formData.gender} 
            type="select"
            options={['Male', 'Female', 'Prefer Not to say']}
            onChange={(val) => setFormData(prev => ({ ...prev, gender: val }))}
          />
          <ProfileField 
            label="Bio" 
            value={formData.bio} 
            type="textarea"
            maxLength={250}
            onChange={(val) => setFormData(prev => ({ ...prev, bio: val }))}
          />
        </div>

        {/* Action Button */}
        <div className="pt-8 space-y-4">
          <div className="relative">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full h-16 ${showSuccess ? 'bg-green-600' : 'bg-noir-gold'} text-noir-bg font-black uppercase text-base rounded-3xl flex items-center justify-center active:scale-[0.98] transition-all shadow-[0_15px_40px_rgba(0,0,0,0.2)] overflow-hidden`}
            >
              <AnimatePresence mode="wait">
                {isSaving ? (
                  <motion.div 
                    key="saving"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 border-2 border-noir-bg/20 border-t-noir-bg rounded-full animate-spin" />
                    <span>Synchronizing...</span>
                  </motion.div>
                ) : showSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="flex items-center gap-3"
                  >
                    <span>Profile Updated</span>
                  </motion.div>
                ) : (
                  <motion.span 
                    key="normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Save Changes
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-10 left-0 right-0 text-center"
              >
                <span className="text-[10px] font-black text-noir-gold uppercase tracking-[0.2em] bg-noir-gold/10 px-4 py-1.5 rounded-full border border-noir-gold/20">
                  Resonance Confirmed
                </span>
              </motion.div>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={logout}
              className="flex-1 py-4 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all active:scale-95 border border-white/10 rounded-2xl"
            >
              Log Out
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 py-4 bg-noir-rust/20 text-noir-rust font-bold text-xs uppercase tracking-widest hover:bg-noir-rust/30 transition-all active:scale-95 border border-noir-rust/30 rounded-2xl flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative noir-card p-8 w-full max-w-sm border-noir-rust/20 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-noir-rust/10 text-noir-rust flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Sever Connection?</h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  This action is permanent. All your likes, uploads, and visual resonance history will be wiped from the NOIR servers.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full py-4 bg-noir-rust text-white font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? "Wiping Data..." : "Confirm Deletion"}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 text-white/20 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ProfileFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: 'text' | 'date' | 'textarea' | 'select';
  options?: string[];
  maxLength?: number;
}

const ProfileField: React.FC<ProfileFieldProps> = ({ label, value, onChange, icon, placeholder, type = 'text', options, maxLength }) => (
  <div className="bg-[#0A2016]/40 backdrop-blur-md rounded-2xl p-5 flex justify-between items-center border border-white/[0.05] hover:border-noir-gold/30 transition-all duration-300 group ring-1 ring-white/5 focus-within:ring-noir-gold/40 focus-within:bg-[#0A2016]/60">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2 opacity-40 group-focus-within:opacity-100 transition-all">
        {icon && <span className="text-noir-gold">{icon}</span>}
        <div className="text-white text-[9px] uppercase font-black tracking-widest leading-none">{label}</div>
      </div>
      
      {type === 'text' && (
        <input 
          type="text" 
          value={value} 
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="text-white text-[15px] font-bold bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-white/10 selection:bg-noir-gold/30"
        />
      )}

      {type === 'date' && (
        <input 
          type="date" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="text-white text-[15px] font-bold bg-transparent border-none p-0 focus:ring-0 w-full [color-scheme:dark] cursor-pointer"
        />
      )}

      {type === 'textarea' && (
        <div className="relative">
          <textarea 
            value={value} 
            placeholder={placeholder}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className="text-white text-[15px] font-bold bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-white/10 resize-none min-h-[80px] leading-relaxed selection:bg-noir-gold/30"
          />
          {maxLength && (
            <div className="absolute -bottom-2 right-0 text-[8px] font-mono text-white/20 px-2 py-0.5 rounded-full bg-white/5">
              {value.length}/{maxLength}
            </div>
          )}
        </div>
      )}

      {type === 'select' && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-white text-[15px] font-bold bg-transparent border-none p-0 focus:ring-0 w-full bg-zinc-900 cursor-pointer appearance-none"
        >
          {options?.map(opt => (
            <option key={opt} value={opt} className="bg-zinc-900 text-sm py-2">{opt}</option>
          ))}
        </select>
      )}
    </div>
    <div className="text-white/5 group-focus-within:text-noir-gold/50 transition-all pl-4 group-hover:text-white/20">
      {type === 'textarea' ? <Pencil size={18} className="mt-1" /> : <Pencil size={18} />}
    </div>
  </div>
);

