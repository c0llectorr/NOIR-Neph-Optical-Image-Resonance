import { SongRecommendation } from '../types';

export const shareToWhatsApp = async (imageUrl: string, song: SongRecommendation) => {
  const caption = `✨ This aesthetic is everything. Currently vibing to "${song.title}" by ${song.artist}. It's the only sound that fits this moment. 🌙\n\nFind your vibe at VibeMatch.AI`;
  
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'vibe-match.jpg', { type: 'image/jpeg' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My VibeMatch',
          text: caption,
        });
        return { success: true };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, canceled: true };
        }
        throw err;
      }
    } else {
      // Fallback for desktop/unsupported browsers: Text only
      window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank');
      return { success: true, textOnly: true };
    }
  } catch (err) {
    console.error('WhatsApp share failed:', err);
    throw err;
  }
};

export const shareToInstagram = async (imageUrl: string, song: SongRecommendation) => {
  const caption = `My current aesthetic decoded by AI. 🌌 Track: ${song.title} — ${song.artist}. #VibeMatch #Aesthetic`;
  
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'vibe-story.jpg', { type: 'image/jpeg' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'VibeMatch Story',
          text: caption,
          url: window.location.origin
        });
        return { success: true };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, canceled: true };
        }
        throw err;
      }
    } else {
      // Manual fallback instructions
      const textToCopy = `Listening to ${song.title} by ${song.artist} on VibeMatch!`;
      await navigator.clipboard.writeText(textToCopy);
      return { success: false, copied: true };
    }
  } catch (err) {
    console.error('Instagram share failed:', err);
    throw err;
  }
};

export const shareVibeDirectly = async (imageUrl: string, song: SongRecommendation) => {
  // 1. Copy song name to clipboard first as requested
  try {
    await navigator.clipboard.writeText(`${song.title} ${song.artist}`);
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
  }

  const caption = `✨ Matching this vibe with "${song.title}" by ${song.artist}. #NOIR #Aesthetic`;
  
  try {
    // Basic share data
    const shareData: any = {
      title: 'NOIR Vibe Match',
      text: caption,
      url: window.location.origin
    };

    // Attempt to include the image file if possible
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'vibe-match.jpg', { type: 'image/jpeg' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }
    } catch (fileErr) {
      console.warn('Could not prepare image for sharing:', fileErr);
      // Continue with text-only share
    }

    if (navigator.share) {
      await navigator.share(shareData);
      return { success: true };
    } else {
      // Fallback to WhatsApp for general sharing if native share is missing
      window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank');
      return { success: true, fallback: true };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return { success: false, canceled: true };
    console.error('Share failed:', err);
    return { success: false, error: err };
  }
};
