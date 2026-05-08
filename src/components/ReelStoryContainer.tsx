import React from 'react';
import { motion } from 'motion/react';

interface ReelStoryContainerProps {
  imageUrl: string;
  mediaType?: 'image' | 'video';
  children?: React.ReactNode;
  showBackground?: boolean;
  isPlaying?: boolean;
}

export const ReelStoryContainer: React.FC<ReelStoryContainerProps> = ({
  imageUrl,
  mediaType = 'image',
  children,
  showBackground = true,
  isPlaying = true,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const bgVideoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (mediaType === 'video') {
      if (isPlaying) {
        videoRef.current?.play().catch(() => {});
        bgVideoRef.current?.play().catch(() => {});
      } else {
        videoRef.current?.pause();
        bgVideoRef.current?.pause();
      }
    }
  }, [isPlaying, mediaType]);

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* Immersive Background Blur Layer */}
      {showBackground && (
        <div className="absolute inset-0 z-0">
          {mediaType === 'video' ? (
            <video 
              ref={bgVideoRef}
              src={imageUrl} 
              className="w-full h-full object-cover scale-110 blur-3xl opacity-40" 
              muted 
              loop 
              playsInline 
            />
          ) : (
            <img 
              src={imageUrl} 
              alt="" 
              className="w-full h-full object-cover scale-110 blur-3xl opacity-40" 
            />
          )}
          {/* Subtle gradient overlay to enhance depth */}
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/60" />
        </div>
      )}

      {/* Main Content Layer - Preserving Aspect Ratio */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full h-full flex items-center justify-center pointer-events-none"
        >
          {mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={imageUrl}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
              muted
              loop
              playsInline
              style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.5))' }}
            />
          ) : (
            <img
              src={imageUrl}
              alt="Reel Content"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
              style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.5))' }}
            />
          )}
        </motion.div>
      </div>

      {/* Overlay Content (Song details, glass-card elements) */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {children}
      </div>
    </div>
  );
};
