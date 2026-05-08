import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Share2, Instagram, MessageCircle, Copy, Check, Music } from 'lucide-react';
import { SongRecommendation } from '../types';
import { shareToWhatsApp, shareToInstagram } from '../lib/shareUtils';

interface ShareViewProps {
  imageUrl: string | null;
  song: SongRecommendation | null;
}

export const ShareView: React.FC<ShareViewProps> = ({ imageUrl, song }) => {
  const [copied, setCopied] = useState(false);

  const handleShareWhatsApp = async () => {
    if (!imageUrl || !song) return;
    try {
      await shareToWhatsApp(imageUrl, song);
    } catch (err) {
      alert("Sharing to WhatsApp failed.");
    }
  };

  const handleShareInstagram = async () => {
    if (!imageUrl || !song) {
        alert("Analyze an image first to share your vibe!");
        return;
    }

    try {
      const result = await shareToInstagram(imageUrl, song);
      if (result.copied) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert("Web Share not fully supported. We've copied the song info! Open Instagram and paste it in the music search.");
      }
    } catch (err) {
      alert("Sharing failed. You might be in a constrained or non-secure environment.");
    }
  };

  const copyToClipboard = async () => {
    if (!song) return;
    const text = `${song.title} by ${song.artist}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!imageUrl || !song) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-8 text-white/10">
          <Share2 size={40} />
        </div>
        <h2 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter mb-4">Nothing to <span className="text-[#FFCC00]">Share</span> Yet</h2>
        <p className="text-xs text-white/30 font-mono uppercase tracking-[0.2em] leading-relaxed max-w-[240px]">
          Upload an image and discover your sound before sharing it with the world.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-2">
        <div className="flex items-center gap-2 mb-2">
          <Share2 size={14} className="text-[#FFCC00]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-white/40">Spread the Vibe</span>
        </div>
        <h2 className="text-3xl font-display font-black text-white italic uppercase leading-none tracking-tighter">
          Share Your <span className="text-[#FFCC00]">Sound</span>
        </h2>
      </div>

      <div className="relative aspect-[9/16] max-w-[280px] mx-auto rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
        <img src={imageUrl} alt="Vibe" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="glass-card p-3 flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg vibe-gradient flex items-center justify-center shrink-0">
               <Music size={20} className="text-white" />
             </div>
             <div className="min-w-0">
               <p className="text-[14px] font-display font-black text-white truncate uppercase italic leading-tight">{song.title}</p>
               <p className="text-[10px] text-white/60 truncate">{song.artist}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pb-32">
        <button
          onClick={handleShareInstagram}
          className="h-16 rounded-2xl bg-gradient-to-tr from-[#FFDC80] via-[#E1306C] to-[#C13584] text-white flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
        >
          <Instagram size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Story</span>
        </button>

        <button
          onClick={handleShareWhatsApp}
          className="h-16 rounded-2xl bg-[#25D366] text-white flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
        >
          <MessageCircle size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">WhatsApp</span>
        </button>

        <button
          onClick={copyToClipboard}
          className="h-16 rounded-2xl bg-white/5 border border-white/10 text-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-all col-span-2"
        >
          {copied ? <Check size={24} className="text-green-500" /> : <Copy size={24} className="text-white/40" />}
          <span className="text-[10px] font-bold uppercase tracking-widest">{copied ? 'Copied!' : 'Copy Song Info'}</span>
        </button>
      </div>
    </div>
  );
};
