import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Music, Sparkles, Search, X } from 'lucide-react';
import { SongCard } from './SongCard';
import { SongRecommendation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserContent } from '../contexts/UserContentContext';

interface LikedSongsProps {
  onPreview: (song: SongRecommendation) => void;
}

export const LikedSongs: React.FC<LikedSongsProps> = ({ onPreview }) => {
  const { user } = useAuth();
  const { likedSongs, loadingLikes: loading } = useUserContent();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSongs = likedSongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-[#FFCC00]/30 border-t-[#FFCC00] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between px-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-noir-gold fill-noir-gold" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-white/40">Collection</span>
          </div>
          <h2 className="text-3xl font-display font-black text-white uppercase leading-none tracking-tighter">
            Liked <span className="text-noir-gold underline decoration-noir-gold/30 underline-offset-4">Tracks</span>
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[28px] font-display font-black text-noir-gold leading-none">{likedSongs.length}</p>
          <p className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-widest mt-1">Total</p>
        </div>
      </div>

      {likedSongs.length > 0 && (
        <div className="px-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FFCC00] transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search by title or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/05 rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-[#FFCC00]/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {likedSongs.length > 0 ? (
        <div className="space-y-3 pb-32">
          <AnimatePresence mode="popLayout">
            {filteredSongs.length > 0 ? (
              filteredSongs.map((song, i) => (
                <motion.div
                  key={song.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <SongCard 
                    song={song} 
                    rank={likedSongs.indexOf(song)} 
                    onPreview={onPreview} 
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-white/30 font-mono text-[10px] uppercase tracking-widest">No matching tracks found</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 px-8 border border-dashed border-white/10 rounded-[40px] bg-white/[0.01]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/10">
            <Heart size={32} />
          </div>
          <h3 className="text-white font-bold mb-2">No liked songs yet</h3>
          <p className="text-xs text-white/30 max-w-[200px] mx-auto leading-relaxed uppercase tracking-wider font-mono">
            Discover new music by uploading images and like your favorites!
          </p>
        </div>
      )}
    </div>
  );
};
