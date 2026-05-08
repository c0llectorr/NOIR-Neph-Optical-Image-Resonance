import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User, Star, Quote } from 'lucide-react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface Review {
  id: string;
  username: string;
  text: string;
  rating: number;
  timestamp: any;
}

export const ReviewView: React.FC = () => {
  const { userData, user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Review));
      setReviews(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.trim() || !user || !userData) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        username: userData.username,
        text: newReview,
        rating,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
      setNewReview('');
      setRating(5);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6 space-y-10 animate-in fade-in duration-700">
      <main className="space-y-10">
        {/* Post Review Form */}
        <section>
          <form onSubmit={handleSubmit} className="noir-card p-6 border-white/[0.05] space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Cast your verdict</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`transition-all active:scale-90 ${star <= rating ? 'text-noir-gold' : 'text-white/10'}`}
                  >
                    <Star size={16} fill={star <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            
            <textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="How precise was NOIR's decoding?"
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-noir-gold/20 transition-all min-h-[80px] resize-none"
            />
            
            <button
              type="submit"
              disabled={isSubmitting || !newReview.trim()}
              className="w-full h-12 bg-noir-gold text-noir-bg font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_20px_rgba(242,153,0,0.2)] disabled:opacity-50"
            >
              {isSubmitting ? "TRANSMITTING..." : (
                <>
                  <Send size={14} /> Submit Resonance
                </>
              )}
            </button>
          </form>
        </section>

        {/* Reviews List */}
        <section className="space-y-4 pb-20">
          <div className="flex items-center gap-3 px-1 mb-6">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest whitespace-nowrap">Global Testimonials</h3>
            <div className="h-[1px] bg-white/5 w-full" />
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="noir-card p-5 space-y-4 group transition-colors hover:bg-white/[0.01]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-noir-surface flex items-center justify-center border border-white/5 shadow-inner">
                          <User size={14} className="text-white/40" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[11px] font-bold text-white/70 italic">@{review.username}</span>
                         <span className="text-[8px] font-mono text-white/20 uppercase">Verified User</span>
                       </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star 
                          key={idx} 
                          size={10} 
                          className={idx < review.rating ? 'text-noir-gold' : 'text-white/5'} 
                          fill={idx < review.rating ? 'currentColor' : 'none'} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Quote className="text-noir-teal/20 shrink-0" size={14} />
                    <p className="text-[11px] text-white/40 leading-relaxed font-medium italic">
                      {review.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};

