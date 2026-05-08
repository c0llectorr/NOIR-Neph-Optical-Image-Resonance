import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { SongRecommendation } from '../types';

interface MusicContextType {
  currentSong: SongRecommendation | null;
  isPlaying: boolean;
  playSong: (song: SongRecommendation) => void;
  pauseSong: () => void;
  progress: number;
  error: string | null;
  setPlaybackRate: (rate: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<SongRecommendation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  useEffect(() => {
    // Single audio element for the whole app
    const audioObj = new Audio();
    audioObj.preload = "auto";
    // Removed crossOrigin to avoid CORS issues with Apple's CDN since we only need playback
    audioRef.current = audioObj;
    
    const audio = audioRef.current;
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleError = (e: any) => {
      const audioError = audio.error;
      let detailedError = "Unknown error";
      
      if (audioError) {
        switch (audioError.code) {
          case 1: detailedError = "Playback aborted"; break;
          case 2: detailedError = "Network error"; break;
          case 3: detailedError = "Audio decoding failed"; break;
          case 4: detailedError = "Audio format not supported or source unavailable"; break;
        }
        console.error("Audio internal error:", audioError.code, audioError.message || detailedError);
      }
      
      console.error("Audio playback error event for src:", audio.src, e);
      setIsPlaying(false);
      const srcDomain = audio.src ? new URL(audio.src, window.location.href).hostname : 'unknown';
      setError(`Playback Error: ${detailedError} (on ${srcDomain}). Try another track.`);
    };

    const handleCanPlay = () => {
      console.log("Audio can play:", audio.src);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
    };
  }, []);

  const playSong = useCallback(async (song: SongRecommendation) => {
    setError(null);
    if (!audioRef.current) return;
    const audio = audioRef.current;

    console.log(`[MusicContext] playSong requested for: ${song.title} (${song.artist})`);

    // Toggle same song - but only if the previewUrl hasn't changed
    // This allows re-loading if a song was resolved with a new URL
    const isSameSong = currentSong?.id === song.id;
    const isSameUrl = audio.src.includes(encodeURIComponent(song.previewUrl || '')) || audio.src === song.previewUrl;

    if (isSameSong && isSameUrl && audio.src) {
      console.log(`[MusicContext] Same song and URL detected, toggling playback. isPlaying: ${isPlaying}`);
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
            setError(null);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error("[MusicContext] Playback resume error:", err);
            setError(`Failed to resume: ${err.message}`);
          }
        }
      }
      return;
    }

    // Switch to new song or retry loading if src was missing
    if (song.previewUrl && (song.previewUrl.startsWith('http') || song.previewUrl.startsWith('/api'))) {
      const proxiedUrl = song.previewUrl.startsWith('/api') 
        ? song.previewUrl 
        : `/api/proxy-audio?url=${encodeURIComponent(song.previewUrl)}`;
        
      console.log(`[MusicContext] Switching track to: ${song.title} - URL: ${proxiedUrl}`);
      try {
        // Reset current state
        audio.pause();
        setProgress(0); 
        audio.removeAttribute('src'); 
        audio.load();
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 50));
        
        audio.src = proxiedUrl;
        audio.load(); // Trigger the fetch
        setCurrentSong(song);
        
        // Use play promise
        console.log(`[MusicContext] Attempting audio.play() for ${song.title}`);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log(`[MusicContext] Playback successful for ${song.title}`);
          setIsPlaying(true);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log(`[MusicContext] Playback of ${song.title} interrupted by new request`);
        } else {
          console.warn(`[MusicContext] Proxy playback failed for "${song.title}", trying direct URL...`, err.message);
          // Fallback to direct URL if proxy fails (maybe crossOrigin issue, etc)
          try {
            audio.pause();
            audio.src = song.previewUrl;
            audio.load();
            const fallbackPromise = audio.play();
            if (fallbackPromise !== undefined) {
              await fallbackPromise;
              console.log(`[MusicContext] Fallback playback successful for ${song.title}`);
              setIsPlaying(true);
              setError(null);
            }
          } catch (fallbackErr: any) {
            if (fallbackErr.name !== 'AbortError') {
              console.error(`[MusicContext] Playback terminal failure for "${song.title}":`, fallbackErr.message);
              setIsPlaying(false);
              const audioError = audio.error;
              const errorMsg = audioError ? ` (Code ${audioError.code}: ${audioError.message})` : ` (${fallbackErr.message})`;
              const srcDomain = audio.src ? new URL(audio.src, window.location.href).hostname : 'unknown';
              setError(`Playback Fail: ${errorMsg} from ${srcDomain}. Check your connection.`);
            }
          }
        }
      }
    } else {
      console.warn(`[MusicContext] No preview URL available for: ${song.title}`);
      setError("NO PREVIEW AVAILABLE");
      setCurrentSong(song); // Still set current song so UI reflects selection
      setIsPlaying(false);
    }
  }, [currentSong, isPlaying]);

  const pauseSong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        pauseSong();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, pauseSong]);

  return (
    <MusicContext.Provider value={{ currentSong, isPlaying, playSong, pauseSong, progress, error, setPlaybackRate }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
