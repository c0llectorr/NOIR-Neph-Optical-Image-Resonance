import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, ArrowRight, X, Play, Camera, Star } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Atmospheric Decoding",
      description: "NOIR translates the emotional architecture of your visuals into pure sonic resonance.",
      icon: <div className="w-16 h-16 bg-noir-gold rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(242,153,0,0.3)]"><Music size={32} className="text-black" /></div>,
      color: "var(--noir-gold)"
    },
    {
      title: "Visual Capture",
      description: "Upload a scene or use the camera to record a moment. Our engine analyzes every pixel for emotional subtext.",
      demo: (
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/5 group">
          <img 
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800" 
            className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
            alt="Demo vibe"
          />
          <div className="absolute inset-0 bg-noir-bg/20 flex items-center justify-center">
            <motion.div 
               animate={{ 
                 scale: [1, 1.1, 1],
                 rotate: [0, 90, 180, 270, 360]
               }} 
               transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
               className="w-20 h-20 rounded-full border border-noir-gold/20 flex items-center justify-center"
            >
              <Camera size={24} className="text-noir-gold" />
            </motion.div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 py-3 px-4 rounded-xl bg-noir-bg/80 backdrop-blur-md border border-white/5">
            <p className="text-[10px] font-mono text-noir-gold uppercase tracking-[0.3em] font-bold">Decoding Narrative...</p>
          </div>
        </div>
      )
    },
    {
      title: "Sonic Curation",
      description: "Discover tracks meticulously matched to your visual narrative. Save your favorites to build your aesthetic history.",
      demo: (
        <div className="space-y-3 w-full">
          {[
            { title: "Deep Resonance", artist: "Ghost City", score: 98 },
            { title: "Neon Pulse", artist: "Synthetic", score: 92 }
          ].map((song, i) => (
            <motion.div 
              key={i}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="noir-card p-4 rounded-2xl flex items-center gap-3 border-white/5 bg-white/[0.02]"
            >
              <div className="w-10 h-10 rounded-lg bg-noir-gold/10 flex items-center justify-center">
                <Play size={16} className="text-noir-gold" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate">{song.title}</p>
                <p className="text-[10px] text-white/40 truncate font-mono uppercase">{song.artist}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                 <div className="flex gap-0.5">
                   {[1,2,3].map(s => <Star key={s} size={6} className="text-noir-gold fill-noir-gold" />)}
                 </div>
                 <span className="text-[10px] font-mono text-noir-teal font-bold">{song.score}%</span>
              </div>
            </motion.div>
          ))}
          <div className="py-2 text-center">
             <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.4em]">Integrated Experience</p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-noir-bg flex flex-col items-center justify-center p-8">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-noir-teal/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-noir-rust/5 rounded-full blur-[100px]" />
      </div>

      {/* Skip Button */}
      <button 
        onClick={onComplete}
        className="absolute top-12 right-8 text-noir-gold text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-80 transition-opacity flex items-center gap-2 font-mono group"
      >
        Skip <X size={14} className="group-hover:rotate-90 transition-transform" />
      </button>

      <div className="flex items-center justify-center mb-16 opacity-20">
        <span className="text-2xl font-display font-extrabold text-noir-gold tracking-tightest">NOIR</span>
        <div className="w-2 h-2 rounded-full bg-noir-rust ml-1" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center"
          >
            {steps[step].icon && (
              <div className="mb-10">
                {steps[step].icon}
              </div>
            )}
            
            {steps[step].demo && (
              <div className="mb-12 w-full max-w-[280px]">
                {steps[step].demo}
              </div>
            )}

            <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter mb-4 leading-tight px-4">
              {steps[step].title}
            </h2>
            
            <p className="text-[12px] text-white/40 leading-relaxed max-w-[280px] mb-12 font-medium">
              {steps[step].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="w-full flex flex-col items-center gap-8">
          <button 
            onClick={handleNext}
            className="w-full h-16 rounded-2xl bg-white text-black font-black flex items-center justify-center gap-3 active:scale-95 transition-all group"
          >
            {step === steps.length - 1 ? "BEGIN DECODING" : "NEXT PROTOCOL"}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Pagination dots */}
          <div className="flex gap-3">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-0.5 rounded-full transition-all duration-700 ${i === step ? 'w-10 bg-noir-gold' : 'w-2 bg-white/10'}`} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
