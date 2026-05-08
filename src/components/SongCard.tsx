import React, { useState } from "react";
import { Play, Heart, MessageSquare, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SongRecommendation } from "../types";
import { useMusic } from "../contexts/MusicContext";
import { useUserContent } from "../contexts/UserContentContext";

interface SongCardProps {
  song: SongRecommendation;
  rank: number;
  onPreview: (song: SongRecommendation) => void;
  onFeedback?: (songId: string, feedback: 'positive' | 'negative') => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, rank, onPreview }) => {
  const { currentSong, isPlaying, playSong } = useMusic();
  const { likedSongs, toggleLike, addReview } = useUserContent();
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  
  const isCurrent = currentSong?.id === song.id;
  const isActuallyPlaying = isCurrent && isPlaying;
  const isLiked = likedSongs.some(s => s.id === song.id);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (song.previewUrl) {
      playSong(song);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(song);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommenting(!isCommenting);
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    await addReview({
      songId: song.id,
      songTitle: song.title,
      artist: song.artist,
      albumArt: song.albumArt,
      isLiked,
      comment: comment.trim()
    });
    setIsSubmitting(false);
    setShowCheck(true);
    setTimeout(() => {
      setShowCheck(false);
      setIsCommenting(false);
      setComment("");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`border-b border-white/5 hover:bg-white/[0.02] transition-all flex flex-col group p-0 overflow-hidden ${isCurrent ? 'bg-noir-gold/5' : ''}`}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Album Art with Play overlay */}
        <div 
          className="relative w-16 h-16 rounded-lg overflow-hidden bg-noir-surface shadow-xl shrink-0 cursor-pointer group/art"
          onClick={togglePlay}
        >
          <img 
            src={song.albumArt || `https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200`} 
            alt={song.title} 
            className="w-full h-full object-cover transition-transform group-hover/art:scale-105" 
          />
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all ${isActuallyPlaying ? 'opacity-100' : 'opacity-0 group-hover/art:opacity-100'}`}>
            {isActuallyPlaying ? (
              <div className="flex gap-0.5 items-end h-4">
                <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-noir-gold rounded-full" />
                <motion.div animate={{ height: [12, 6, 12] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-noir-gold rounded-full" />
                <motion.div animate={{ height: [16, 10, 16] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-noir-gold rounded-full" />
              </div>
            ) : (
              <Play size={20} className="text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 py-1" onClick={() => onPreview(song)}>
          <h4 className="text-[15px] font-bold text-white truncate group-hover:text-noir-gold transition-colors leading-tight">{song.title}</h4>
          <p className="text-[12px] text-white/40 truncate mt-1 font-medium tracking-tight">{song.artist}</p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2">
           <button 
             onClick={handleComment}
             className={`p-2 rounded-full transition-all active:scale-90 ${isCommenting ? 'text-noir-gold bg-noir-gold/10' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
           >
             <MessageSquare size={18} />
           </button>
           <button 
             onClick={handleLike}
             className={`p-2 rounded-full transition-all active:scale-90 ${isLiked ? 'text-noir-gold bg-noir-gold/10' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
           >
             <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
           </button>
        </div>
      </div>

      {/* Comment Input Expansion */}
      <AnimatePresence>
        {isCommenting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="relative">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share what you like about this song..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-noir-gold/50 h-20 resize-none"
                  autoFocus
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    onClick={submitComment}
                    disabled={isSubmitting || !comment.trim()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      showCheck 
                        ? 'bg-green-500 text-white' 
                        : 'bg-noir-gold text-black hover:bg-noir-gold/80'
                    } disabled:opacity-30`}
                  >
                    {showCheck ? <Check size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


