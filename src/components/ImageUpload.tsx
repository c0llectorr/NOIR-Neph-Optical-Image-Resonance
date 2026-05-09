import React, { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon, Camera, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { resizeImage } from "../lib/imageUtils";
import { ALLOWED_MIME_TYPES } from "../services/geminiService";

export interface MediaItem {
  base64: string;
  type: string;
  mediaType: 'image' | 'video';
}

interface ImageUploadProps {
  onUpload: (media: MediaItem[]) => void;
  onClear?: () => void;
  isLoading: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload, onClear, isLoading }) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processVideo = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      return isMedia && (ALLOWED_MIME_TYPES.includes(file.type) || file.type === "");
    });

    if (validFiles.length < fileArray.length) {
      alert("Security Filter: Only image and video files (JPG, PNG, GIF, MP4, etc.) are permitted. Zip files, documents, and other non-media formats have been blocked.");
    }

    if (validFiles.length === 0) return;

    setIsProcessing(true);
    const newMediaItems: MediaItem[] = [];

    try {
      for (const file of validFiles) {
        // Double check limits within the loop using functional state logic
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (isImage) {
          try {
            const base64 = await resizeImage(file, 1000, 1000, 0.7);
            newMediaItems.push({ base64, type: file.type, mediaType: 'image' });
          } catch (e) {
            console.error("Resize failed for file:", file.name, e);
          }
        } else if (isVideo) {
          try {
            const durationPromise = new Promise<{duration: number, base64: string}>((resolve, reject) => {
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.onloadedmetadata = async () => {
                window.URL.revokeObjectURL(video.src);
                const duration = video.duration;
                const base64 = await processVideo(file);
                resolve({ duration, base64 });
              };
              video.onerror = () => reject(new Error("Failed to load video metadata"));
              video.src = URL.createObjectURL(file);
            });

            const { duration, base64 } = await durationPromise;
            newMediaItems.push({ base64, type: file.type, mediaType: 'video' });
          } catch (e) {
            console.error("Video processing failed:", file.name, e);
          }
        }
      }

      if (newMediaItems.length > 0) {
        setMediaItems(prev => {
          const updated = [...prev, ...newMediaItems].slice(0, 8);
          // Removed onUpload from here
          return updated;
        });
      }
    } catch (err) {
      console.error("Media processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []); // Removed onUpload dependency

  // Sync state to parent via useEffect to avoid "update during render" warnings
  React.useEffect(() => {
    onUpload(mediaItems);
    if (mediaItems.length === 0) {
      onClear?.();
    }
  }, [mediaItems, onUpload, onClear]);

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Essential: Clear the value so the same file selection triggers onChange again
      e.target.value = "";
    }
  };

  return (
    <div className="w-full mx-auto relative">
      {/* Persistent Hidden Input for empty state - stable and doesn't unmount during processing */}
      {mediaItems.length === 0 && (
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 z-50 cursor-pointer"
          onChange={onSelect}
          disabled={isLoading || isProcessing}
          title=""
        />
      )}

      <AnimatePresence>
        {mediaItems.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`
              relative h-72 rounded-[28px] border-2 border-dashed transition-all duration-500
              flex flex-col items-center justify-center p-8 text-center
              ${isDragging ? "border-noir-gold bg-noir-gold/10" : "border-noir-teal/40 bg-noir-teal/[0.03] hover:border-noir-teal/80 hover:bg-noir-teal/[0.06]"}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <div className={`w-16 h-16 rounded-full bg-noir-teal/10 flex items-center justify-center mb-4 transition-transform duration-500 ${isDragging ? 'scale-110' : ''}`}>
              <Upload className="text-noir-teal w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">Drop or tap to upload</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono">1-8 Images/Videos · Max 20MB / item</p>
            </div>

            <div className="flex gap-2 mt-6">
              <span className="pill pill-teal">PNG</span>
              <span className="pill pill-teal">JPG</span>
              <span className="pill pill-teal">MP4</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid-state"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {mediaItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black shadow-xl"
                  >
                    {item.mediaType === 'image' ? (
                      <img src={item.base64} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.base64} className="w-full h-full object-cover" controls={false} autoPlay loop muted playsInline />
                    )}
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeMedia(idx); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-noir-rust transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10"
                    >
                      <X size={14} />
                    </button>
                    {idx === 0 && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-noir-teal text-white text-[7px] font-bold uppercase rounded tracking-tighter shadow-lg">
                        Primary
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {mediaItems.length < 8 && !isLoading && !isProcessing && (
                  <motion.div
                    layout
                    className="relative aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-noir-teal/40 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center group cursor-pointer"
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={onSelect}
                    />
                    <ImageIcon className="text-white/20 group-hover:text-noir-teal/60 transition-colors" size={24} />
                    <span className="text-[8px] font-bold text-white/20 uppercase mt-2">{8 - mediaItems.length} more</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {(isLoading || isProcessing) && (
              <div className="noir-card p-4 flex items-center gap-4 border-white/[0.05]">
                <div className="relative w-8 h-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-noir-teal/10 border-t-noir-teal rounded-full"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-white/40 font-mono font-bold uppercase tracking-wider">
                      {isProcessing ? "Processing Assets" : "Decoding Vibe"}
                    </p>
                    <span className="text-[8px] font-bold text-noir-teal">{mediaItems.length}/8</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-noir-teal"
                      animate={{ width: "100%" }}
                      transition={{ duration: 10, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

