import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, RefreshCw, ChevronLeft, Hexagon, Share2, Heart, Pause, Play, ChevronUp, AlertCircle, Zap, MessageSquare, Send, X } from 'lucide-react';
import { ProcessingResult, SongRecommendation } from '../types';
import { shareVibeDirectly } from '../lib/shareUtils';
import { ReelStoryContainer } from './ReelStoryContainer';
import { useMusic } from '../contexts/MusicContext';
import { useUserContent } from '../contexts/UserContentContext';

interface SongsViewProps {
  result: ProcessingResult | null;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  onRefine: (instruction: string) => void;
  isLoadingRefine: boolean;
  onReset: () => void;
  onPreview: (song: SongRecommendation) => void;
  onFeedback: (id: string, feedback: 'positive' | 'negative') => void;
}

export const SongsView: React.FC<SongsViewProps> = ({
  result,
  onLoadMore,
  isLoadingMore,
  onRefine,
  isLoadingRefine,
  onReset,
  onPreview,
  onFeedback
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isShuttling, setIsShuttling] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPauseFeedback, setShowPauseFeedback] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { playSong, pauseSong, isPlaying, currentSong: playingSong, progress, error: musicError, setPlaybackRate } = useMusic();
  const { likedSongs, addReview, isOffline } = useUserContent();

  const songs = result?.recommendations || [];
  const imageUrl = Array.isArray(result?.imageUrl) ? result?.imageUrl[0] : (result?.imageUrl || '');
  const mediaType = result?.mediaType || 'image';

  const isNavigating = useRef(false);
  const lastPlayedIdRef = useRef<string | null>(null);

  const navigate = useCallback((newDirection: number) => {
    if (isNavigating.current) return;
    
    const nextIndex = currentIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < songs.length) {
      isNavigating.current = true;
      setDirection(newDirection);
      setCurrentIndex(nextIndex);
      
      // Infinite Scroll Threshold: Fetch more when 5 songs remaining
      if (songs.length - nextIndex <= 5 && !isLoadingMore && !isOffline) {
        onLoadMore();
      }

      // Reset navigation lock after transition
      setTimeout(() => {
        isNavigating.current = false;
      }, 800);
    }
  }, [currentIndex, songs.length, onLoadMore, isLoadingMore, isOffline]);

  const togglePlay = useCallback(() => {
    setShowPauseFeedback(true);
    setTimeout(() => setShowPauseFeedback(false), 800);

    if (isPlaying) {
      pauseSong();
    } else if (songs[currentIndex]) {
      playSong(songs[currentIndex]);
    }
  }, [isPlaying, pauseSong, songs, currentIndex, playSong]);

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || !songs[currentIndex]) return;
    
    setIsSubmittingReview(true);
    try {
      const song = songs[currentIndex];
      await addReview({
        songId: song.id,
        songTitle: song.title,
        artist: song.artist,
        albumArt: song.albumArt,
        comment: reviewText.trim(),
        isLiked: isCurrentlyLiked
      });
      setReviewText('');
      setShowReviewModal(false);
    } catch (err) {
      console.error("Failed to add review:", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Side zones for 2x speed (shuttle)
    if (xPercent < 20 || xPercent > 80) {
      longPressTimer.current = setTimeout(() => {
        setIsShuttling(true);
        setPlaybackRate(2);
      }, 500);
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isShuttling) {
      setIsShuttling(false);
      setPlaybackRate(1);
    }
  };

  const handleTap = useCallback((e: any, info: any) => {
    // If we were just shuttling, don't trigger a tap
    if (isShuttling) return;

    // Safety check for interactive elements
    const target = e.target as HTMLElement;
    if (target?.closest('button') || target?.closest('a') || target?.closest('textarea')) return;

    // Toggle play/pause for any tap that wasn't on a button
    // This provides a much better UX similar to standard reel players
    togglePlay();
  }, [isShuttling, togglePlay]);

  // Handle auto-advance when song ends or reaches near end
  useEffect(() => {
    if (isPlaying && progress > 99.5 && !isNavigating.current) {
      if (currentIndex < songs.length - 1) {
        navigate(1);
      }
    }
  }, [progress, isPlaying, currentIndex, songs.length, navigate]);

  // Play song when index changes or song data updates (e.g. previewUrl resolved)
  useEffect(() => {
    // DO NOT trigger playback while we are in a loading/refining state
    if (isLoadingRefine) return;

    const song = songs[currentIndex];
    if (song) {
      console.log(`[SongsView] Effect triggered for index ${currentIndex}: ${song.title}`);
      
      const isAlreadyCurrent = playingSong?.id === song.id;
      const alreadyTried = lastPlayedIdRef.current === song.id;
      
      if (!isAlreadyCurrent && !alreadyTried) {
        lastPlayedIdRef.current = song.id;
        playSong(song);
      } else if (isAlreadyCurrent && !isPlaying && song.previewUrl && !alreadyTried) {
         // Auto-play on index change if not currently playing but has URL and we haven't tried yet
         lastPlayedIdRef.current = song.id;
         playSong(song);
      }
    }
    setShowDescription(false);
  }, [currentIndex, songs, playingSong?.id, isPlaying, playSong, isLoadingRefine]);

  // Auto-pause on unmount (navigation)
  useEffect(() => {
    return () => {
      pauseSong();
    };
  }, [pauseSong]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Robust check for any editable element to prevent intercepting spaces/keys
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable;

      if (isEditable) {
        return;
      }

      if (e.key === 'ArrowUp') navigate(-1);
      if (e.key === 'ArrowDown') navigate(1);
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, togglePlay]);

  if (!result || songs.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-noir-bg flex flex-col items-center justify-center p-8 overflow-hidden font-sans">
        {/* Simple Background Glow */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-noir-gold/10 rounded-full blur-[100px]"
          />
        </div>

        <div className="relative z-10 w-full max-w-xs space-y-12">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-white">How to Use</h1>
            <p className="text-white/30 text-sm font-medium">Get ready for the vibe...</p>
          </div>

          <div className="text-center">
             <AnimatePresence mode="wait">
               <motion.div 
                 key={Math.floor(Date.now() / 4000) % 4}
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.05 }}
                 className="space-y-8"
               >
                 <div className="h-24 flex items-center justify-center">
                    {Math.floor(Date.now() / 4000) % 4 === 0 ? (
                      <div className="relative w-32 h-44 border-2 border-white/10 rounded-3xl bg-white/5 flex items-center justify-center overflow-hidden">
                        <motion.div 
                          animate={{ y: [20, -10, 20], opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute bottom-4"
                        >
                           <div className="w-12 h-12 rounded-full bg-noir-gold/20 flex items-center justify-center">
                              <Play size={16} className="text-noir-gold fill-noir-gold" />
                           </div>
                        </motion.div>
                        <motion.div 
                          animate={{ scale: [0.8, 1, 0.8], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-16 h-16 rounded-full bg-white/10 border border-white/20"
                        />
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/20 uppercase tracking-widest">TAP MIDDLE</div>
                      </div>
                    ) : Math.floor(Date.now() / 4000) % 4 === 1 ? (
                      <div className="relative w-full h-32 flex items-center justify-center gap-1 px-4">
                        <div className="flex-1 h-full border border-noir-gold/20 bg-noir-gold/5 rounded-xl flex items-center justify-center">
                           <motion.div
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                           >
                             <Zap size={14} className="text-noir-gold" />
                           </motion.div>
                        </div>
                        <div className="flex-1 h-full border border-white/10 bg-white/5 rounded-xl flex items-center justify-center">
                           <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                              <Pause size={10} className="text-white/40" />
                           </div>
                        </div>
                        <div className="flex-1 h-full border border-noir-gold/20 bg-noir-gold/5 rounded-xl flex items-center justify-center">
                           <motion.div
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                           >
                             <Zap size={14} className="text-noir-gold" />
                           </motion.div>
                        </div>
                        <div className="absolute -bottom-6 text-[8px] font-black text-white/20 uppercase tracking-widest">HOLD SIDES TO 2X</div>
                      </div>
                    ) : Math.floor(Date.now() / 4000) % 4 === 2 ? (
                      <div className="flex flex-col items-center gap-2">
                        <motion.div animate={{ y: [20, -20] }} transition={{ repeat: Infinity, duration: 0.8, repeatType: 'reverse' }}>
                          <ChevronUp size={48} className="text-noir-gold opacity-60" />
                        </motion.div>
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">SWIPE UP FOR NEXT</div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center gap-1 opacity-60">
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Heart size={16} />
                          </div>
                          <span className="text-[7px] font-black text-white/40 uppercase">LIKE</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 scale-125">
                          <div className="w-12 h-12 rounded-full bg-white/10 border border-noir-gold/40 flex items-center justify-center">
                            <Share2 size={24} className="text-noir-gold" />
                          </div>
                          <span className="text-[8px] font-black text-noir-gold uppercase">SHARE</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 opacity-60">
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <MessageSquare size={16} />
                          </div>
                          <span className="text-[7px] font-black text-white/40 uppercase">REVIEW</span>
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="space-y-2">
                   <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                     {["Control Everything", "Speed through Vibe", "Fluid Navigation", "React & Share"][Math.floor(Date.now() / 4000) % 4]}
                   </h2>
                   <p className="text-white/50 text-[15px] font-medium leading-relaxed px-4">
                     {[
                       "Tap the middle to pause both music and video whenever you need a moment.",
                       "Scan songs faster by holding either side of the screen for 2x playback speed.",
                       "Simply swipe up or down to cycle through your custom generated suggestions.",
                       "Found the perfect track? Like it, review it, or share it with your network."
                     ][Math.floor(Date.now() / 4000) % 4]}
                   </p>
                 </div>
               </motion.div>
             </AnimatePresence>
          </div>

          <div className="pt-8 flex flex-col items-center gap-4">
             <div className="flex gap-2">
                {[0,1,2,3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ 
                      scale: Math.floor(Date.now() / 4000) % 4 === i ? 1.5 : 1,
                      backgroundColor: Math.floor(Date.now() / 4000) % 4 === i ? 'rgba(242,153,0,1)' : 'rgba(242,153,0,0.2)'
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-2 h-2 rounded-full"
                  />
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSong = songs[currentIndex];
  const isCurrentlyLiked = likedSongs.some(s => s.id === currentSong.id);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col touch-none">
      {/* Persistent Background Layer - Never unmounts, preventing flicker */}
      <div className="absolute inset-0 z-0">
        {mediaType === 'video' ? (
          <video 
            key={imageUrl}
            src={imageUrl} 
            className="w-full h-full object-cover scale-110 blur-3xl opacity-40" 
            muted 
            loop 
            playsInline 
            autoPlay={isPlaying}
          />
        ) : (
          <img 
            src={imageUrl} 
            alt="" 
            className="w-full h-full object-cover scale-110 blur-3xl opacity-40" 
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/80" />
      </div>

      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          initial={{ y: direction > 0 ? "100%" : direction < 0 ? "-100%" : 0 }}
          animate={{ y: 0 }}
          exit={{ y: direction > 0 ? "-100%" : direction < 0 ? "100%" : 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.8 }}
          className="absolute inset-0 z-10 cursor-pointer pointer-events-auto"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_: any, info: any) => {
            const threshold = 50;
            if (info.offset.y < -threshold) {
              navigate(1);
            } else if (info.offset.y > threshold) {
              navigate(-1);
            }
          }}
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTap={handleTap}
          onClick={handleTap}
        >
          <ReelStoryContainer imageUrl={imageUrl} mediaType={mediaType} showBackground={false} isPlaying={isPlaying}>
             {/* 2x Speed Indicator Overlay */}
             <AnimatePresence>
               {isShuttling && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="absolute inset-x-0 top-1/4 flex flex-col items-center gap-2 z-[60]"
                 >
                   <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-2">
                     <Zap size={16} className="text-noir-gold fill-noir-gold animate-pulse" />
                     <span className="text-sm font-black text-white italic tracking-widest uppercase">2X Speed</span>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {/* Play/Pause feedback overlay */}
             <AnimatePresence>
               {showPauseFeedback && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.5 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.5 }}
                   className="absolute inset-0 flex items-center justify-center z-[55] pointer-events-none"
                 >
                   <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-noir-gold/20 flex items-center justify-center">
                     {isPlaying ? (
                       <Play size={24} className="text-noir-gold fill-noir-gold ml-1" />
                     ) : (
                       <Pause size={24} className="text-noir-gold fill-noir-gold" />
                     )}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {/* Simple play icon when paused and NOT pulsing feedback */}
             {!isPlaying && !showPauseFeedback && (
               <div className="absolute inset-0 flex items-center justify-center z-[54] pointer-events-none">
                 <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-60">
                   <Play size={12} className="text-white fill-white ml-0.5" />
                 </div>
               </div>
             )}

             {/* Gradient for text readability */}
             <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

             {/* UI Overlays */}
             <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
                {/* Top: Progress & Controls */}
                <div className="pt-12 flex flex-col gap-4 pointer-events-auto">
                   <div className="flex gap-1">
                     {songs.map((_, i) => (
                       <div key={i} className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                         {i === currentIndex ? (
                           <motion.div 
                             className="h-full bg-white"
                             style={{ width: `${progress}%` }}
                           />
                         ) : (
                           <div className={`h-full bg-white transition-opacity ${i < currentIndex ? 'opacity-40' : 'opacity-0'}`} style={{ width: '100%' }} />
                         )}
                       </div>
                     ))}
                   </div>
                   
                   <div className="flex justify-end items-center">
                      <div className="flex items-center gap-3">
                        {musicError && (
                          <div className="flex flex-col items-end gap-1">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-bold ${
                              musicError.includes('PLAYBACK') || musicError.includes('Error') 
                                ? 'bg-noir-rust/20 border-noir-rust/30 text-noir-rust' 
                                : 'bg-white/10 border-white/20 text-white/60'
                            }`}>
                               <AlertCircle size={10} />
                               {musicError.toUpperCase().includes('PREVIEW') ? 'SOURCE UNAVAILABLE' : 'TRACK PLAYBACK FAILED'}
                            </div>
                            <p className="text-[7px] text-white/30 font-mono uppercase tracking-tighter max-w-[150px] text-right">
                              {musicError}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-noir-teal/20 backdrop-blur-md border border-noir-teal/30">
                           <Hexagon size={12} className="text-noir-teal animate-pulse" />
                           <span className="text-[10px] font-black text-noir-teal uppercase tracking-widest">{currentIndex + 1} / {songs.length}</span>
                        </div>
                     </div>
                   </div>
                </div>

                {/* Bottom: Song Details & Actions */}
                <div className="pb-12 space-y-6">
                   <div className="flex items-end justify-between gap-6">
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex-1 space-y-2 pointer-events-auto"
                      >
                         <button 
                           onClick={() => setShowDescription(!showDescription)}
                           className="text-left outline-hidden"
                         >
                            <div className="flex flex-col">
                               <p className="text-[11px] font-black text-white italic tracking-tight drop-shadow-lg">
                                 ({currentSong.title} — {currentSong.artist})
                               </p>
                               <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em] mt-0.5">
                                 {currentSong.mood}
                               </span>
                            </div>
                         </button>

                         <AnimatePresence>
                           {showDescription && (
                             <motion.div
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, y: 10 }}
                               className="max-w-[240px]"
                             >
                                <p className="text-[10px] leading-relaxed text-white/60 font-medium pt-1">
                                  {currentSong.explanation}
                                </p>
                             </motion.div>
                           )}
                         </AnimatePresence>
                      </motion.div>

                      {/* Side Actions Column */}
                      <div className="flex flex-col gap-5 pointer-events-auto shrink-0 mb-4 items-center">
                         <ActionButton 
                           icon={<Heart size={20} className={isCurrentlyLiked ? 'fill-noir-gold text-noir-gold' : 'text-noir-gold/40'} />} 
                           label={isCurrentlyLiked ? 'Liked' : 'Like'} 
                           onClick={(e) => { e.stopPropagation(); onFeedback(currentSong.id, 'positive'); }}
                         />
                         <ActionButton 
                           icon={<MessageSquare size={20} className="text-noir-gold/40" />} 
                           label="Review" 
                           onClick={(e) => { e.stopPropagation(); setShowReviewModal(true); }}
                         />
                         <ActionButton 
                           icon={<Share2 size={20} className="text-noir-gold/40" />} 
                           label="Share" 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             shareVibeDirectly(imageUrl, currentSong);
                           }}
                         />
                      </div>
                   </div>

                   {/* Swipe Indicator */}
                   <div className="flex flex-col items-center gap-1 opacity-25">
                      <ChevronUp size={16} className="animate-bounce" />
                      <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/60">Swipe up for more</p>
                   </div>
                </div>
             </div>
          </ReelStoryContainer>
        </motion.div>
      </AnimatePresence>
      {/* Review Modal Overlay */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setShowReviewModal(false)}
              className="absolute top-12 right-6 p-2 text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-10 duration-500">
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-display font-black text-white">Share your <span className="text-noir-gold">thoughts</span></h3>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em]">Reviewing: {currentSong.title}</p>
              </div>

              <div className="relative">
                <textarea
                  autoFocus
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What does this vibe make you feel?"
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white placeholder:text-white/10 focus:outline-hidden focus:border-noir-gold/50 transition-all resize-none"
                />
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                   <span className="text-[10px] font-mono text-white/20">{reviewText.length} / 500</span>
                </div>
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewText.trim()}
                className="w-full py-4 bg-noir-gold text-noir-bg font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
              >
                {isSubmittingReview ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    <span>Post Vibe Review</span>
                  </>
                )}
              </button>

              <p className="text-center text-[9px] text-white/20 uppercase tracking-widest px-8 leading-relaxed">
                Your review will be saved locally and synchronized across the NOIR network for sonic optimization.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine Overlay Trigger - Replaced with minimal state or onboarding style */}
      {isLoadingRefine && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center overflow-hidden p-10">
          <div className="absolute inset-0">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-noir-gold/5 rounded-full blur-[120px] animate-pulse" />
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-noir-teal/5 rounded-full blur-[120px] animate-pulse delay-700" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-10 max-w-sm">
            <div className="relative w-16 h-16 flex items-center justify-center">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 border-2 border-t-noir-gold border-r-transparent border-b-transparent border-l-transparent rounded-full"
               />
               <RefreshCw size={24} className="text-noir-gold opacity-50" />
            </div>
            
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                {isLoadingRefine ? "Syncing Vibe" : "Fetching More"}
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4">
                   <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Zap size={14} className="text-noir-gold" />
                      </div>
                      <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Hold edge for 2X</span>
                   </div>
                   <div className="w-[1px] h-4 bg-white/10" />
                   <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Pause size={14} className="text-noir-gold" fill="currentColor" />
                      </div>
                      <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Tap center to pause</span>
                   </div>
                </div>
                <p className="text-white/40 text-[11px] font-medium leading-relaxed px-6">
                  Sit back as we fine-tune the frequency response for your visual aesthetic.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ icon, label, onClick }: { icon: any, label: string, onClick: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 group outline-hidden"
  >
    <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-2xl border border-noir-gold/10 flex items-center justify-center group-hover:bg-noir-gold/10 group-active:scale-90 transition-all shadow-xl">
      <div className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        {icon}
      </div>
    </div>
    <span className="text-[7px] font-black text-noir-gold/40 uppercase tracking-tighter mt-0.5">{label}</span>
  </button>
);



