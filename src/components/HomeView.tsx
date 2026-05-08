import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Camera, Globe, ChevronRight, Activity, Zap, TrendingUp } from 'lucide-react';
import { ImageUpload, MediaItem } from './ImageUpload';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { useUserContent } from '../contexts/UserContentContext';
import { ProcessingResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HomeViewProps {
  onUpload: (media: MediaItem[], instruction?: string, languages?: string[], artistFilter?: string) => void;
  isLoading: boolean;
  selectedLanguages: string[];
  onToggleLanguage: (lang: string) => void;
  artistFilter: string;
  setArtistFilter: (artist: string) => void;
  onCurationSelect: (curation: ProcessingResult) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onUpload, 
  isLoading,
  selectedLanguages,
  onToggleLanguage,
  artistFilter,
  setArtistFilter,
  onCurationSelect
}) => {
  const { user } = useAuth();
  const { curations, isOffline } = useUserContent();
  const [stagedMedia, setStagedMedia] = useState<MediaItem[]>([]);
  const actionButtonRef = useRef<HTMLDivElement>(null);
  const languages = ['English', 'Urdu', 'Hindi', 'Arabic', 'Spanish', 'French', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Korean', 'Japanese'];

  const handleSubmit = React.useCallback((media: MediaItem[]) => {
    setStagedMedia(media);
    // Auto scroll to action button after media set
    if (media.length > 0) {
      setTimeout(() => {
        actionButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  const handleClearStaged = React.useCallback(() => {
    setStagedMedia([]);
  }, []);

  const handleStartProcess = () => {
    if (stagedMedia.length > 0) {
      onUpload(stagedMedia, undefined, selectedLanguages, artistFilter);
      setStagedMedia([]);
    }
  };

  const chartData = curations.slice().reverse().map(c => ({
    time: c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    energy: c.vibe?.energyLevel || 0,
    activity: c.vibe?.activityLevel || 0
  }));

  return (
    <div className="px-6 space-y-6 pb-12 animate-in fade-in duration-700">
      {/* Upload Region */}
      <div className="relative">
        <ImageUpload 
          onUpload={handleSubmit} 
          onClear={handleClearStaged}
          isLoading={isLoading} 
        />
      </div>

      <div className="text-center font-mono text-[9px] text-white/20 uppercase tracking-[0.3em]">
        — or tap to open camera —
      </div>

      {/* Artist Preference Card */}
      <div className="noir-card p-5 border-white/[0.05] bg-gradient-to-br from-white/[0.02] to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <ChevronRight size={14} className="text-noir-gold" />
          <h3 className="text-xs font-bold text-white tracking-tight">By Artist <span className="text-white/20 font-normal">(Optional)</span></h3>
        </div>
        
        <div className="space-y-1">
          <input 
            type="text" 
            placeholder="Search Artist (e.g. Arijit Singh, The Weeknd)" 
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:border-noir-gold/20 transition-all font-medium"
          />
          <p className="text-[8px] text-white/20 font-mono uppercase tracking-tighter px-1">
            Focus suggestions around a specific artist
          </p>
        </div>
      </div>

      {/* Language Selector Card */}
      <div className="noir-card p-5 border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-noir-gold" />
            <h3 className="text-xs font-bold text-white tracking-tight">Song Language</h3>
          </div>
          <span className="text-[9px] font-black text-white/20 uppercase">{selectedLanguages.length}/3</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => {
            const isSelected = selectedLanguages.includes(lang);
            return (
              <button
                key={lang}
                onClick={() => onToggleLanguage(lang)}
                className={`pill transition-all active:scale-95 ${
                  isSelected 
                    ? 'pill-gold' 
                    : 'pill-outline hover:border-white/20'
                }`}
              >
                {isSelected && <span className="mr-1">✓</span>}
                {lang}
              </button>
            );
          })}
        </div>
        <p className="text-[8px] text-white/20 font-mono uppercase tracking-tighter mt-4 text-center">
          Recommendations will limited to these languages
        </p>
      </div>

      {/* Action Button & Continuity Graph */}
      <div className="space-y-6" ref={actionButtonRef}>
        <button
          onClick={handleStartProcess}
          disabled={stagedMedia.length === 0 || isLoading || isOffline}
          className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group ${
            stagedMedia.length > 0 && !isLoading && !isOffline
              ? 'bg-noir-gold text-noir-bg shadow-[0_20px_40px_-10px_rgba(242,153,0,0.3)] active:scale-95'
              : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
          }`}
        >
          <Zap size={18} className={`${stagedMedia.length > 0 && !isLoading && !isOffline ? 'fill-current group-hover:animate-pulse text-noir-bg' : 'text-white/10'}`} />
          <span className="uppercase tracking-[0.2em] text-xs">
            {isOffline ? 'Offline - No Sync' : 'Get Songs'}
          </span>
        </button>

        {/* Mood Analytics Graph - Relocated right below generate button */}
        {curations.length > 1 && (
          <div className="noir-card p-5 border-white/[0.05] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-noir-gold" />
                <h3 className="text-xs font-bold text-white tracking-tight">My Energy History</h3>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-noir-teal" />
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Energy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-noir-gold" />
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Activity</span>
                </div>
              </div>
            </div>
            
            <div className="h-32 w-full mt-2 -ml-6">
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={128}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#006E51" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#006E51" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F29900" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F29900" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                    <XAxis 
                      dataKey="time" 
                      hide 
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#01160D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ fontSize: '10px', color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="energy" 
                      stroke="#006E51" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEnergy)" 
                      isAnimationActive={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="activity" 
                      stroke="#F29900" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorActivity)" 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[8px] text-white/20 font-mono uppercase tracking-tighter text-center mt-2">
              How your music mood is evolving over time
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-white/90">Past Vibes</h3>
          <button className="text-[10px] font-bold text-noir-gold flex items-center gap-1 group">
            View all <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-6 px-6">
          {curations.length > 0 ? (
            curations.map((c, i) => (
              <motion.button 
                key={c.id || i}
                whileTap={{ scale: 0.95 }}
                onClick={() => onCurationSelect(c)}
                className="noir-card p-3 flex flex-col items-center gap-2 border-white/[0.03] hover:bg-white/[0.03] transition-colors group min-w-[100px] shrink-0"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 relative group-hover:scale-105 transition-transform duration-500">
                  {c.mediaType === 'video' ? (
                    <video src={Array.isArray(c.imageUrl) ? c.imageUrl[0] : c.imageUrl} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" muted />
                  ) : (
                    <img src={Array.isArray(c.imageUrl) ? c.imageUrl[0] : c.imageUrl} alt="" className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  )}
                  <div className="absolute inset-0 bg-noir-bg/20" />
                </div>
                <span className="text-[8px] font-bold text-white/50 leading-tight text-center truncate w-full uppercase tracking-tighter">{c.vibe?.aestheticStyle || 'Untitled'}</span>
              </motion.button>
            ))
          ) : (
            <div className="w-full text-center py-8 border border-dashed border-white/5 rounded-2xl">
              <p className="text-[9px] font-mono text-white/10 uppercase tracking-widest">No curations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


