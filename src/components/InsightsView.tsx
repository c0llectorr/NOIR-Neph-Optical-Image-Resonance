import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Activity, Palette, Quote } from 'lucide-react';
import { ProcessingResult } from '../types';

interface InsightsViewProps {
  result: ProcessingResult | null;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center space-y-4">
        <Sparkles size={48} className="text-white/10" />
        <h2 className="text-xl font-display font-bold text-white/40 tracking-tight">Awaiting Analysis</h2>
        <p className="text-white/20 text-xs max-w-xs leading-relaxed font-medium">Analysis appears once a visual narrative has been decoded by NOIR.</p>
      </div>
    );
  }

  const { vibe } = result;
  const [selectedBlogLang, setSelectedBlogLang] = useState<string>('English');

  const getBlogContent = () => {
    if (vibe.translatedSentimentProfile && vibe.translatedSentimentProfile[selectedBlogLang]) {
      return vibe.translatedSentimentProfile[selectedBlogLang];
    }
    return vibe.advancedSentimentProfile;
  };

  const availableLangs = vibe.translatedSentimentProfile 
    ? Object.keys(vibe.translatedSentimentProfile).sort((a, b) => {
        if (a === 'English') return -1;
        if (b === 'English') return 1;
        return a.localeCompare(b);
      }) 
    : ['English'];
  const showToggle = availableLangs.length > 1;

  return (
    <div className="min-h-screen pb-40 space-y-8 animate-in fade-in duration-700">
      <header className="px-6 pt-12 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight leading-none uppercase">
            Vi<span className="text-noir-gold">be Check</span>
          </h1>
          <p className="text-white/20 text-[10px] font-mono mt-1 opacity-60">Visual Decoding Interface</p>
        </div>
        <Sparkles size={18} className="text-noir-gold" />
      </header>

      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 space-y-8"
      >
        {/* Sentiment Profile */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <div className="pill pill-teal inline-block">✦ Advanced Sentiment Profile</div>
              {showToggle && (
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                  {availableLangs.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedBlogLang(lang)}
                      className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all rounded-lg ${selectedBlogLang === lang ? 'bg-noir-gold text-noir-bg shadow-lg' : 'text-white/30'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
           </div>
           <div className="noir-card p-6 border-noir-teal/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-noir-teal/5 rounded-full blur-[60px] -mr-10 -mt-10" />
              <AnimatePresence mode="wait">
                <motion.p 
                  key={selectedBlogLang}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm text-white/70 leading-relaxed font-serif italic"
                >
                  "{getBlogContent()}"
                </motion.p>
              </AnimatePresence>
              <div className="mt-6 flex flex-col gap-2">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Activity Level</span>
                    <span className="text-[9px] font-bold text-noir-teal">{Math.round(vibe.activityLevel)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${vibe.activityLevel}%` }}
                      className="h-full bg-noir-teal shadow-[0_0_8px_rgba(0,110,81,0.5)]"
                    />
                 </div>
              </div>
           </div>
        </section>

        {/* Observation Tiles */}
        <section className="grid grid-cols-2 gap-4">
          <ObservationTile label="Subjects" content={vibe.visualObservations.subjects} />
          <ObservationTile label="Composition" content={vibe.visualObservations.composition} />
        </section>

        {/* Analysis Grid */}
        <section className="grid grid-cols-1 gap-4">
           <div className="grid grid-cols-2 gap-4">
             <AnalysisCard icon={<Palette size={14} />} label="Emotions" content={vibe.sentimentProfile.inferredEmotionalLayers.join(" · ")} color="text-noir-gold" border="border-noir-gold/30" />
             <AnalysisCard icon={<Sparkles size={14} />} label="Signals" content={vibe.sentimentProfile.visualSignals.colorDynamics} color="text-noir-rust" border="border-noir-rust/30" />
           </div>
           <AnalysisCard icon={<Activity size={14} />} label="Symbolic Resonance" content={vibe.symbolicResonance} color="text-noir-teal" border="border-noir-teal/30" />
           <AnalysisCard icon={<Quote size={14} />} label="Narrative Intention" content={vibe.inferredNarrativeIntention} color="text-white/60" border="border-white/10" />
        </section>

        {/* Color Psychology */}
        <section className="space-y-4">
           <h3 className="text-xs font-bold text-white/90">Dominant Colours</h3>
           <div className="grid grid-cols-2 gap-3">
              {vibe.colorInterpretations.slice(0, 4).map((c, i) => (
                <div key={i} className="noir-card p-3 flex flex-col gap-2 border-white/[0.05]">
                   <div className="h-8 rounded-lg w-full shadow-inner" style={{ backgroundColor: c.color }} />
                   <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-bold text-white/40 uppercase tracking-tighter">{c.color}</span>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                   </div>
                   <p className="text-[9px] font-medium text-white/60 leading-tight line-clamp-2">"{c.interpretation}"</p>
                </div>
              ))}
           </div>
        </section>
      </motion.main>
    </div>
  );
};

const ObservationTile = ({ label, content }: { label: string; content: string }) => (
  <div className="noir-card p-4 space-y-2 border-white/[0.03]">
    <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">{label}</h4>
    <p className="text-[10px] text-white/50 leading-relaxed font-medium line-clamp-3">{content}</p>
  </div>
);

const AnalysisCard = ({ icon, label, content, color, border }: { icon: any; label: string; content: string; color: string; border: string }) => (
  <div className={`noir-card p-5 space-y-3 ${border}`}>
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 ${color}`}>
       {icon}
       <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-xs text-white/60 leading-relaxed font-medium">{content}</p>
  </div>
);

