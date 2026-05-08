import React from "react";
import { motion } from "motion/react";
import { VibeVector } from "../types";
import { Sparkles, Palette, Eye, Activity, Layers, CornerRightDown, BookOpen } from "lucide-react";

interface VibeDisplayProps {
  vibe: VibeVector;
}

export const VibeDisplay: React.FC<VibeDisplayProps> = ({ vibe }) => {
  return (
    <div className="space-y-6">
      {/* Primary Header */}
      <div className="flex items-end justify-between px-2">
        <div className="max-w-[70%]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1 block italic underline decoration-[#B13BFF]/40 underline-offset-4">Advanced Sentiment Profile</span>
            <h2 className="text-4xl font-display font-black text-gradient uppercase leading-tight tracking-tighter">
            {vibe.complexSentiment || vibe.emotionalTone}
          </h2>
        </div>
        <div className="text-right flex flex-col items-end gap-3">
          <div className="space-y-1">
             <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 block leading-none">Energy</span>
             <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${vibe.energyLevel || 0}%` }}
                  className="h-full bg-noir-teal" 
                />
             </div>
          </div>
          <div className="space-y-1">
             <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 block leading-none">Activity</span>
             <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${vibe.activityLevel || 0}%` }}
                  className="h-full bg-noir-gold" 
                />
             </div>
          </div>
        </div>
      </div>

      {/* Sentiment Layers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-[#B13BFF]">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} className="text-[#B13BFF]" />
            <h4 className="text-xs font-bold text-white tracking-widest uppercase">Emotional Layers</h4>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-[9px] text-white/30 uppercase font-bold block mb-1">Apparent Emotion</span>
              <p className="text-sm font-medium text-white/90">{vibe.sentimentProfile?.apparentEmotion || vibe.emotionalTone || "Analyzing..."}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vibe.sentimentProfile?.inferredEmotionalLayers?.map((layer, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10 uppercase tracking-tighter">
                  {layer}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border-l-4 border-l-[#FFCC00]">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-[#FFCC00]" />
            <h4 className="text-xs font-bold text-white tracking-widest uppercase">Visual Signals</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CornerRightDown size={10} className="mt-1 text-white/20" />
              <div>
                <span className="text-[9px] text-white/30 uppercase font-bold block mb-0.5">Color Dynamics</span>
                <p className="text-[11px] leading-snug text-white/70 italic line-clamp-2">{vibe.sentimentProfile?.visualSignals?.colorDynamics || "Subtle tones detected"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CornerRightDown size={10} className="mt-1 text-white/20" />
              <div>
                <span className="text-[9px] text-white/30 uppercase font-bold block mb-0.5">Composition</span>
                <p className="text-[11px] leading-snug text-white/70 italic line-clamp-2">{vibe.sentimentProfile?.visualSignals?.spatialComposition || "Fluid arrangement"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Signals */}
      {vibe.sentimentProfile?.visualSignals?.symbolismAndMetaphors && (
        <div className="glass-card p-4 bg-gradient-to-br from-white/[0.03] to-transparent">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
              <Activity className="text-[#00FFCC]" size={18} />
            </div>
            <div>
              <h5 className="text-[11px] font-bold text-white/60 flex items-center gap-1.5 uppercase tracking-widest mb-1.5">
                <Palette size={12} className="text-[#00FFCC]" /> Symbolic Resonance
              </h5>
              <p className="text-sm font-display text-white/80 leading-tight">
                {vibe.sentimentProfile?.visualSignals?.symbolismAndMetaphors}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Intent & Context */}
      <div className="glass-card p-4 border-dashed border-white/5">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center shrink-0 border border-[#B13BFF]/20 shadow-[0_0_15px_rgba(177,59,255,0.1)]">
            <Sparkles className="text-[#FFCC00]" size={18} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white/80 mb-1">Inferred Narrative Intention</h5>
            <p className="text-xs text-white/40 leading-relaxed font-mono uppercase tracking-tighter">
              {vibe.inferredIntent}
            </p>
          </div>
        </div>
      </div>

      {/* Swatches */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex -space-x-2">
          {(vibe.colors || []).map((color) => (
            <div
              key={color}
              className="w-10 h-10 rounded-full border-2 border-black shadow-2xl relative group cursor-help transition-transform hover:scale-110 hover:z-10"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="h-px grow bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{vibe.aestheticStyle}</span>
      </div>

      {/* Narrative Section - The Blog/Story Post */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 border-white/[0.05] bg-gradient-to-b from-white/[0.02] to-transparent"
      >
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <BookOpen size={14} className="text-noir-gold" />
          <h4 className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.25em]">The Narrative Resonance</h4>
        </div>
        <p className="text-sm text-white/80 leading-relaxed font-serif italic text-pretty">
          {vibe.advancedSentimentProfile}
        </p>
      </motion.div>
    </div>
  );
};
