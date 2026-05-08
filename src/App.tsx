import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Music, Share2, Heart, LogOut, Hexagon, User, ChevronUp, BookOpen, MessageSquare, Settings, AlertCircle, X as CloseIcon } from "lucide-react";
import { ImageUpload, MediaItem } from "./components/ImageUpload";
import { Onboarding } from "./components/Onboarding";
import { SongCard } from "./components/SongCard";
import { RegistrationForm } from "./components/RegistrationForm";
import { ProfileView } from "./components/ProfileView";
import { HomeView } from "./components/HomeView";
import { SongsView } from "./components/SongsView";
import { InsightsView } from "./components/InsightsView";
import { LikedSongs } from "./components/LikedSongs";
import { shareVibeDirectly } from "./lib/shareUtils";
import { MusicProvider } from "./contexts/MusicContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UserContentProvider, useUserContent } from "./contexts/UserContentContext";
import { analyzeMediaVibe, quickAnalyzeMediaVibe, getImageHash } from "./services/geminiService";
import { ProcessingResult, SongRecommendation } from "./types";
import { doc, setDoc, updateDoc, increment, getDocs, collection, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Login } from "./components/Login";
import { WifiOff, Loader2 } from "lucide-react";

function MainApp() {
  const { user, userData, logout, loading, error: authError, setOnboardingComplete } = useAuth();
  const { quotaExceeded, refreshCurations, isOffline } = useUserContent();
  const [activeTab, setActiveTab] = useState<'home' | 'songs' | 'insights' | 'liked' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [artistFilter, setArtistFilter] = useState<string>('');
  const [selectedSongForStory, setSelectedSongForStory] = useState<SongRecommendation | null>(null);

  const handleRetry = () => {
    // Clear all potential cache blockages
    localStorage.removeItem('quota_exceeded_timestamp');
    localStorage.removeItem('last_sync_timestamp');
    localStorage.removeItem('last_auth_sync');
    refreshCurations();
    window.location.reload();
  };

  // Combine auth error and local error
  const currentError = authError || error;
  const isQuotaError = quotaExceeded || currentError?.toLowerCase().includes('quota') || currentError?.toLowerCase().includes('limit exceeded');
  const isDomainError = currentError?.toLowerCase().includes('authorized domain');

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Server connection test
    const testServer = async () => {
      try {
        const resp = await fetch('/api/health');
        if (!resp.ok) {
          console.error('[ServerHealth] Proxy server health check failed:', resp.status);
        }
      } catch (e) {
        console.error('[ServerHealth] Failed to connect to proxy server', e);
      }
    };
    testServer();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleUpload = React.useCallback(async (media: MediaItem[] | string, instruction?: string, languages?: string[], artist?: string, isLoadMore = false) => {
    if (isOffline) {
      setError("Sync Required: You are currently offline. New curations require an internet connection.");
      return;
    }
    
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setLoadingStatus('Initializing scan...');
      setError(null);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
    
    try {
      const langs = languages || selectedLanguages;
      const art = artist !== undefined ? artist : artistFilter;
      const previousSongs = result?.recommendations?.map(s => `${s.title} by ${s.artist}`) || [];
      
      const mediaArray = Array.isArray(media) 
        ? media.map(m => ({ base64: m.base64, mimeType: m.type })) 
        : [{ base64: media, mimeType: result?.mediaType === 'video' ? 'video/mp4' : 'image/jpeg' }];

      // --- STAGE 0: CACHE CHECK (Cost & Speed Optimization) ---
      if (user && !isLoadMore && !instruction) {
        setLoadingStatus('Checking memory...');
        const imageHash = getImageHash(mediaArray[0].base64);
        const curationsRef = collection(db, 'users', user.uid, 'curations');
        const q = query(curationsRef, where('imageHash', '==', imageHash), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const cachedDoc = querySnapshot.docs[0];
          const cachedData = cachedDoc.data() as ProcessingResult;
          setResult({ ...cachedData, id: cachedDoc.id });
          setActiveTab('songs');
          setIsLoading(false);
          return;
        }
      }

      // --- STAGE 1: LIGHTNING ANALYSIS (Perceived Latency Solution) ---
      let quickResults: { mood: string, genres: string[], keywords: string[] } | null = null;
      if (!isLoadMore) {
        setLoadingStatus('Capturing vibe...');
        quickResults = await quickAnalyzeMediaVibe(mediaArray);
        
        // Optimistically create a placeholder result to show UI immediately
        const placeholderResult: ProcessingResult = {
          id: 'temp_' + Date.now(),
          vibe: {
            emotionalTone: quickResults.mood,
            complexSentiment: "Decoding the visual narrative...",
            sentimentProfile: {
              apparentEmotion: quickResults.mood,
              inferredEmotionalLayers: ["Analyzing..."],
              visualSignals: { colorDynamics: "Sampling...", spatialComposition: "Mapping..." }
            },
            advancedSentimentProfile: "The storyteller is composing a narrative for your scene. The full Vibe Check will appear shortly.",
            translatedSentimentProfile: { English: "Decoding..." },
            visualObservations: { subjects: "Scanning...", attire: "Noting...", composition: "Analyzing...", atmosphere: quickResults.mood },
            activityLevel: 50,
            energyLevel: 50,
            symbolicResonance: "Processing metadata...",
            inferredNarrativeIntention: "Gathering creative fragments...",
            colorInterpretations: [],
            context: quickResults.genres,
            aestheticStyle: quickResults.genres[0],
            colors: ["#6366f1"],
            inferredIntent: "Music Discovery"
          },
          recommendations: [],
          timestamp: new Date().toISOString(),
          imageUrl: mediaArray.map(m => m.base64),
          selectedLanguages: langs,
          mediaType: mediaArray.some(m => m.mimeType.startsWith('video/')) ? 'video' : 'image',
          mediaTypes: mediaArray.map(m => m.mimeType.startsWith('video/') ? 'video' : 'image')
        };
        
        setResult(placeholderResult);
        setActiveTab('songs');
        
        // Start fetching some immediate songs based on the quick vibe
        setLoadingStatus('Generating first tracks...');
        const initialSearchPromises = quickResults.keywords.slice(0, 3).map(async (kw) => {
          try {
            const resp = await fetch(`/api/itunes-search?term=${encodeURIComponent(kw)}&limit=1&v=${Date.now()}`);
            if (resp.ok) {
              const data = await resp.json();
              return data.results?.[0];
            }
          } catch(e) {
            // Silently fail for initial background fetch
          }
          return null;
        });

        const initialTracks = (await Promise.all(initialSearchPromises)).filter(Boolean);
        if (initialTracks.length > 0) {
          setResult(prev => {
            if (!prev) return placeholderResult;
            return {
              ...prev,
              recommendations: initialTracks.map(t => ({
                id: t.trackId?.toString() || Math.random().toString(),
                title: t.trackName,
                artist: t.artistName,
                mood: quickResults?.mood || "Matching",
                explanation: "Matching the core vibe detected in your image.",
                vibeMatchScore: 90,
                previewUrl: t.previewUrl,
                albumArt: t.artworkUrl100
              }))
            };
          });
        }
      }

      // --- STAGE 2: DEEP NARRATIVE (Full AI Power) ---
      setLoadingStatus(isLoadMore ? 'Exploring more...' : 'Deep decoding...');
      const vibeResult = await analyzeMediaVibe(mediaArray, instruction, previousSongs, langs, art);
      
      setLoadingStatus('Resolving audio...');
      // Resolve audio links for each recommendation with local track caching
      const resolvedRecommendations = await Promise.all(
        vibeResult.recommendations.map(async (song) => {
          const cacheKey = `track_res_${song.title}_${song.artist}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const cachedTrack = localStorage.getItem(cacheKey);
          
          if (cachedTrack) {
            try {
              const trackData = JSON.parse(cachedTrack);
              return { ...song, ...trackData };
            } catch (e) {
              localStorage.removeItem(cacheKey);
            }
          }

          try {
            console.log(`[TrackResolver] Resolving: ${song.title} by ${song.artist}`);
            
            const fetchWithLogging = async (url: string) => {
              try {
                const response = await fetch(url);
                if (response.ok) {
                  return await response.json();
                }
                return null;
              } catch (err) {
                return null;
              }
            };

            let data = await fetchWithLogging(`/api/itunes-search?term=${encodeURIComponent(`${song.title} ${song.artist}`)}&v=${Date.now()}`);
            
            // Fallback: If title + artist fails, try just title + one keyword from artist name
            if (!data || !data.results || data.results.length === 0) {
              const simplerTerm = `${song.title} ${song.artist.split(' ')[0]}`;
              data = await fetchWithLogging(`/api/itunes-search?term=${encodeURIComponent(simplerTerm)}&v=${Date.now()}`);
            }

            // Fallback 2: Just song title
            if (!data || !data.results || data.results.length === 0) {
              data = await fetchWithLogging(`/api/itunes-search?term=${encodeURIComponent(song.title)}&v=${Date.now()}`);
            }

            // Fallback 3: Artist only
            if (!data || !data.results || data.results.length === 0) {
              data = await fetchWithLogging(`/api/itunes-search?term=${encodeURIComponent(song.artist)}&v=${Date.now()}`);
            }

            if (data && data.results) {
              const results = data.results as any[];
              const track = results.find(r => !!r.previewUrl);
              
              if (track) {
                console.log(`[TrackResolver] Preview URL found for: ${song.title} -> ${track.previewUrl}`);
                const trackData = {
                  previewUrl: track.previewUrl,
                  albumArt: (track.artworkUrl100 || song.albumArt || "").replace('100x100bb', '600x600bb')
                };
                localStorage.setItem(cacheKey, JSON.stringify(trackData));
                return { ...song, ...trackData };
              } else {
                console.warn(`[TrackResolver] No valid previewUrl found in results for: ${song.title}`);
              }
            } else {
              console.warn(`[TrackResolver] iTunes query returned no results for: ${song.title}`);
            }
          } catch (e) {
            console.warn(`Could not resolve track: ${song.title}`, e);
          }
          
          // Return song but intentionally mark it as unresolvable if previewUrl is missing
          return song;
        })
      );

      vibeResult.recommendations = resolvedRecommendations;
      const imageHash = getImageHash(mediaArray[0].base64);

      if (isLoadMore) {
        setResult(prev => {
          if (!prev) return vibeResult;
          const newResult = {
            ...prev,
            recommendations: [...prev.recommendations, ...vibeResult.recommendations]
          };
          
          if (user && newResult.id && !newResult.id.startsWith('temp_')) {
            const curationRef = doc(db, 'users', user.uid, 'curations', newResult.id);
            updateDoc(curationRef, {
              recommendations: newResult.recommendations,
              updatedAt: new Date().toISOString()
            }).catch(e => console.warn("Failed to sync load-more data:", e));
          }
          
          return newResult;
        });
        setIsLoadingMore(false);
      } else {
        const finalResult: ProcessingResult = {
          ...vibeResult,
          imageUrl: Array.isArray(media) ? media.map(m => m.base64) : media,
          userInstruction: instruction || "",
          id: Date.now().toString(),
          imageHash // Store the hash for future indexing
        };
        
        if (user) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { totalUploads: increment(1) });

            const curationRef = doc(db, 'users', user.uid, 'curations', finalResult.id);
            await setDoc(curationRef, {
              ...finalResult,
              timestamp: new Date().toISOString()
            });
          } catch (e: any) {
            console.warn("Could not save curation data:", e);
          }
        }

        setResult(finalResult);
        setActiveTab('songs');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI was unable to process this scene. Please try another one.");
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isOffline, user, selectedLanguages, artistFilter, result]);

  const { toggleLike } = useUserContent();

  const handleSongFeedback = React.useCallback(async (songId: string, feedback: 'positive' | 'negative') => {
    setResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        recommendations: prev.recommendations.map(s => s.id === songId ? { ...s, feedback } : s)
      };
    });

    if (feedback === 'positive' && result) {
      const song = result.recommendations.find(s => s.id === songId);
      if (song) {
        await toggleLike(song);
      }
    }
  }, [result, toggleLike]);

    const handleToggleLanguage = React.useCallback((lang: string) => {
      setSelectedLanguages(prev => {
        if (prev.includes(lang)) {
          if (prev.length === 1) return prev; // Keep at least one
          return prev.filter(l => l !== lang);
        }
        if (prev.length >= 3) return prev; // Limit to 3
        return [...prev, lang];
      });
    }, []);

    const handleCurationSelect = React.useCallback((curation: ProcessingResult) => {
      setResult(curation);
      setActiveTab('songs');
    }, []);

    const handleShare = React.useCallback(async (song: SongRecommendation) => {
    const imageUrl = Array.isArray(result?.imageUrl) ? result.imageUrl[0] : (result?.imageUrl || '');
    await shareVibeDirectly(imageUrl, song);
  }, [result]);

  if (loading) {
    return (
      <div className="min-h-screen bg-noir-bg flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative mb-8"
        >
            <div className="flex items-center">
              <span className="text-6xl font-display font-black text-noir-gold tracking-tightest">NOIR</span>
              <div className="w-4 h-4 rounded-full bg-noir-rust shadow-[0_0_20px_rgba(181,58,24,1)] animate-pulse mb-2 ml-1" />
            </div>
        </motion.div>
        <div className="w-48 h-[1px] bg-white/10 relative overflow-hidden">
          <motion.div 
            animate={{ x: [-192, 192] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-noir-gold/50 to-transparent"
          />
        </div>
        <p className="mt-4 text-[10px] font-mono text-white/40 uppercase tracking-[0.5em] flex items-center gap-2">
          {loadingStatus || 'Processing scene'}
          <Loader2 size={10} className="animate-spin text-noir-gold" />
        </p>
      </div>
    );
  }

  if (isDomainError) {
    return (
      <div className="min-h-screen bg-noir-bg flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
          <Settings className="text-blue-500 w-10 h-10 animate-spin-slow" />
        </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">AUTH BLOCKED</h2>
        <div className="w-12 h-1 bg-blue-500 mb-6 mx-auto" />
        <p className="text-white/60 text-sm max-w-sm mb-6 font-light leading-relaxed">
          Noir doesn't recognize this domain yet. You need to authorize this URL in your Firebase Console.
        </p>
        
        <div className="noir-card p-6 border-white/5 bg-white/[0.02] mb-10 text-left w-full max-w-md">
           <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Required Action</p>
           <ol className="text-xs text-white/70 space-y-3 list-decimal pl-4">
             <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Firebase Console</a></li>
             <li>Select your project <b>(project-537999226047)</b></li>
             <li>Navigate to <b>Authentication</b> → <b>Settings</b> → <b>Authorized domains</b></li>
             <li>Add <b>{window.location.hostname}</b> to the list</li>
           </ol>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all font-mono"
        >
          Check Again
        </button>
      </div>
    );
  }

  // Only show full page quota error if we have NO user data at all
  if (isQuotaError && !userData) {
    return (
      <div className="min-h-screen bg-noir-bg flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-noir-rust/10 border border-noir-rust/20 flex items-center justify-center mb-6">
          <Heart className="text-noir-rust w-10 h-10 animate-pulse" />
        </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">QUOTA EXCEEDED</h2>
        <div className="w-12 h-1 bg-noir-rust mb-6 mx-auto" />
        <p className="text-white/60 text-sm max-w-xs mb-8 font-light leading-relaxed">
          The database has reached its free limit for today. Noir needs to recharge its energy.
        </p>
        <button 
          onClick={handleRetry}
          className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!userData) {
    return <RegistrationForm />;
  }

  if (userData.onboardingComplete === false) {
    return <Onboarding onComplete={setOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-44 relative overflow-x-hidden selection:bg-noir-gold/20">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-noir-bg">
        <div className="glow-orb top-[10%] left-[-10%] w-80 h-80 bg-noir-teal/20" />
        <div className="glow-orb bottom-[20%] right-[-10%] w-64 h-64 bg-noir-rust/15" style={{ animationDelay: '1.5s' }} />
        <div className="glow-orb top-[40%] right-[10%] w-96 h-96 bg-noir-gold/10" style={{ animationDelay: '3s' }} />
      </div>

      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-noir-gold text-noir-bg py-2 px-4 flex items-center justify-center gap-3 shadow-2xl"
          >
            <WifiOff size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Vibe Shield Active: You are currently Offline</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(error || isQuotaError) && !isDomainError && !isOffline && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-6 right-6 z-50 px-4 py-3 rounded-2xl bg-noir-bg/90 backdrop-blur-xl border border-noir-rust/20 shadow-2xl flex items-center gap-3"
          >
            <div className={`w-8 h-8 rounded-full ${isQuotaError ? 'bg-amber-500/10' : 'bg-noir-rust/10'} flex items-center justify-center shrink-0`}>
              <AlertCircle size={16} className={isQuotaError ? 'text-amber-500' : 'text-noir-rust'} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-0.5">
                {isQuotaError ? "Offline Cache Mode" : "System Warning"}
              </p>
              <p className="text-xs text-white/70 truncate">
                {isQuotaError ? "Daily resource limit reached. Viewing cached curations." : error}
              </p>
            </div>
            {!isQuotaError && (
              <button 
                onClick={() => setError(null)}
                className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors"
              >
                <CloseIcon size={14} className="text-white/40" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 px-6 pt-12 pb-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
              <div className="flex items-center peer cursor-default">
                <span className="text-4xl font-display font-black text-noir-gold tracking-tightest">NOIR</span>
                <div className="w-2.5 h-2.5 rounded-full bg-noir-rust ml-1 shadow-[0_0_12px_rgba(181,58,24,0.8)]" />
              </div>
            <p className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.5em] mt-2">Neph Optical Image Resonance</p>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {activeTab === 'home' && (
          <HomeView 
            onUpload={handleUpload} 
            isLoading={isLoading}
            selectedLanguages={selectedLanguages}
            onToggleLanguage={handleToggleLanguage}
            artistFilter={artistFilter}
            setArtistFilter={setArtistFilter}
            onCurationSelect={handleCurationSelect}
          />
        )}

        {activeTab === 'songs' && (
          <SongsView 
            result={result}
            onLoadMore={() => result && handleUpload(Array.isArray(result.imageUrl) ? result.imageUrl[0] : result.imageUrl, result.userInstruction, selectedLanguages, artistFilter, true)}
            isLoadingMore={isLoadingMore}
            onRefine={(inst) => result && handleUpload(Array.isArray(result.imageUrl) ? result.imageUrl[0] : result.imageUrl, inst)}
            isLoadingRefine={isLoading}
            onReset={() => {
              setResult(null);
              setActiveTab('home');
            }}
            onPreview={handleShare}
            onFeedback={handleSongFeedback}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView result={result} />
        )}

        {activeTab === 'liked' && (
          <LikedSongs onPreview={handleShare} />
        )}

        {activeTab === 'profile' && (
          <ProfileView 
            user={user} 
            userData={userData} 
            logout={logout}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-noir-surface/90 backdrop-blur-3xl border-t border-white/[0.05] pb-10">
        <div className="max-w-lg mx-auto px-6 pt-4 flex justify-between items-center">
          <NavBtn icon={<Hexagon size={20} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavBtn icon={<Music size={20} />} label="Songs" active={activeTab === 'songs'} onClick={() => setActiveTab('songs')} disabled={!result} />
          <NavBtn icon={<Sparkles size={20} />} label="Vibe Check" active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} disabled={!result} />
          <NavBtn icon={<Heart size={20} />} label="Liked" active={activeTab === 'liked'} onClick={() => setActiveTab('liked')} />
          <NavBtn 
            icon={
              <div className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center overflow-hidden ${activeTab === 'profile' ? 'border-noir-gold shadow-[0_0_10px_rgba(242,153,0,0.3)]' : 'border-white/10'}`}>
                {userData?.photoURL ? (
                  <img src={userData.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-white/20" />
                )}
              </div>
            } 
            label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} 
          />
        </div>
      </nav>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed right-6 bottom-52 w-12 h-12 rounded-2xl bg-noir-card border border-white/10 text-noir-gold flex items-center justify-center shadow-2xl z-50 active:scale-90 transition-transform"
          >
            <ChevronUp size={22} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

const NavBtn = ({ icon, label, active, onClick, disabled = false }: { icon: any, label: string, active: boolean, onClick: () => void, disabled?: boolean }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-noir-gold' : 'text-white/20'} ${disabled ? 'opacity-10 cursor-not-allowed' : 'hover:text-white/40'}`}
  >
    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${active ? 'bg-noir-gold/10' : ''}`}>
      <div className={active ? 'drop-shadow-[0_0_8px_rgba(242,153,0,0.4)]' : ''}>
        {icon}
      </div>
    </div>
    <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default function App() {
  return (
    <AuthProvider>
      <UserContentProvider>
        <MusicProvider>
          <MainApp />
        </MusicProvider>
      </UserContentProvider>
    </AuthProvider>
  );
}


