import React from 'react';
import { motion } from 'motion/react';
import { Languages } from 'lucide-react';

export const MUSIC_LANGUAGES = [
  { id: 'English', label: 'English' },
  { id: 'Hindi', label: 'Hindi' },
  { id: 'Urdu', label: 'Urdu' },
  { id: 'Punjabi', label: 'Punjabi' },
  { id: 'Spanish', label: 'Spanish' },
  { id: 'German', label: 'German' },
  { id: 'French', label: 'French' },
  { id: 'Russian', label: 'Russian' },
  { id: 'Polish', label: 'Polish' },
  { id: 'Japanese', label: 'Japanese' },
  { id: 'Korean', label: 'Korean' },
  { id: 'Turkish', label: 'Turkish' },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelect: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLanguage, onSelect }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Languages size={12} className="text-white/40" />
        <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-[0.2em]">Curation Language</span>
      </div>
      
      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar scroll-smooth snap-x">
        {MUSIC_LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => onSelect(lang.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all snap-start
              ${selectedLanguage === lang.id 
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                : 'bg-white/5 text-white/30 border border-white/5 hover:border-white/10 hover:text-white/60'
              }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
};
