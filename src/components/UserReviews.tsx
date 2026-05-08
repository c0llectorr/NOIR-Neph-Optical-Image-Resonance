import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Trash2, Heart, Music, Clock, MessageSquare } from 'lucide-react';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface UserReviewsProps {
  userId: string;
  onBack: () => void;
}

export const UserReviews: React.FC<UserReviewsProps> = ({ userId, onBack }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Use the correct path based on our updated structural schema
    const reviewsRef = collection(db, 'users', userId, 'reviews');
    const q = query(
      reviewsRef, 
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      // Gracefully handle "index missing" or other firestore errors
      console.warn("Firestore error in UserReviews:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (reviewId: string) => {
    if (!userId || deletingId) return;
    
    setDeletingId(reviewId);
    try {
      await deleteDoc(doc(db, 'users', userId, 'reviews', reviewId));
    } catch (err) {
      console.error("Error deleting review:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/reviews/${reviewId}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-noir-bg text-white pb-40 px-6 pt-12"
    >
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">
              Review <span className="text-noir-gold">Log</span>
            </h1>
            <p className="text-white/20 text-[10px] font-mono uppercase tracking-[0.3em] mt-1">Your interaction history</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-display font-black text-white/10 italic">{reviews.length}</span>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="flex gap-1">
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-noir-gold rounded-full" />
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-noir-gold rounded-full" />
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-noir-gold rounded-full" />
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 px-10 space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={24} className="text-white/10" />
          </div>
          <p className="text-white/40 text-sm font-medium leading-relaxed italic">
            "Silence is golden, but reviews are better. Share your thoughts on recommended tracks."
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-[#11261E]/40 border border-white/[0.03] rounded-3xl p-5 hover:border-noir-gold/20 transition-all duration-500 overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-noir-surface shadow-lg shrink-0 border border-white/5">
                    {review.albumArt ? (
                      <img src={review.albumArt} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <Music size={16} className="text-white/10" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{review.songTitle}</h4>
                    <p className="text-[10px] text-white/30 truncate mt-0.5 uppercase tracking-tighter">{review.artist}</p>
                    <div className="flex items-center gap-3 mt-2">
                       <span className={`text-[9px] font-black uppercase flex items-center gap-1 ${review.isLiked ? 'text-noir-gold' : 'text-white/20'}`}>
                         <Heart size={10} fill={review.isLiked ? 'currentColor' : 'none'} /> {review.isLiked ? 'Liked' : 'Neutral'}
                       </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDelete(review.id)}
                  disabled={deletingId === review.id}
                  className="p-2 rounded-full hover:bg-noir-rust/10 text-white/10 hover:text-noir-rust transition-all active:scale-95"
                >
                  {deletingId === review.id ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                       <Clock size={14} />
                    </motion.div>
                  ) : <Trash2 size={16} />}
                </button>
              </div>

              {review.comment && (
                <div className="relative pl-4 border-l border-noir-gold/20">
                  <p className="text-[13px] text-white/60 leading-relaxed font-medium italic">
                    "{review.comment}"
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/[0.02]">
                <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">
                  Log entry: {review.id.slice(-8)}
                </span>
                <span className="text-[9px] font-mono text-white/20">
                  {review.timestamp?.toDate ? review.timestamp.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Logged'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
