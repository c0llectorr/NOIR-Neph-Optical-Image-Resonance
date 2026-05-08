export interface VibeVector {
  emotionalTone: string;
  complexSentiment: string;
  sentimentProfile: {
    apparentEmotion: string;
    inferredEmotionalLayers: string[];
    visualSignals: {
      colorDynamics: string;
      spatialComposition: string;
      facialAndBodySignals?: string;
      symbolismAndMetaphors?: string;
    };
  };
  advancedSentimentProfile: string;
  translatedSentimentProfile?: { [lang: string]: string };
  visualObservations: {
    subjects: string;
    attire: string;
    composition: string;
    atmosphere: string;
  };
  activityLevel: number; // 0 to 100
  energyLevel: number; // 0 to 100
  symbolicResonance: string;
  inferredNarrativeIntention: string;
  colorInterpretations: { color: string; interpretation: string }[];
  context: string[];
  aestheticStyle: string;
  colors: string[];
  inferredIntent: string;
}

export interface SongRecommendation {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  mood: string;
  explanation: string;
  vibeMatchScore: number;
  previewUrl?: string; // Optional URL for audio playback
  feedback?: 'positive' | 'negative' | null;
}

export interface SongReview {
  userId: string;
  songId: string;
  songTitle: string;
  artist: string;
  albumArt?: string;
  isLiked: boolean;
  comment?: string;
  timestamp: any; // serverTimestamp
}

export interface ProcessingResult {
  id?: string;
  vibe: VibeVector;
  recommendations: SongRecommendation[];
  ocrText?: string;
  timestamp?: string;
  imageUrl: string | string[];
  userInstruction?: string;
  selectedLanguages?: string[];
  mediaType?: 'image' | 'video';
  mediaTypes?: ('image' | 'video')[];
  imageHash?: string;
}
