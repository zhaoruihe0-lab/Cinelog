import React, { useEffect, useState, useRef } from 'react';
import { Movie, Review } from '../types';

interface MovieCardProps {
  movie: Movie;
  onBack: () => void;
  onEdit: (movie: Movie) => void;
  onDelete: (id: string) => void;
  onUpdate?: (movie: Movie) => void;
}

const ClearBtn = ({ onClick, visible }: { onClick: () => void, visible: boolean }) => (
    <button 
        type="button" 
        onClick={onClick} 
        className={`text-neutral-500 hover:text-red-500 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        title="Clear"
    >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
);

// Helper to resize images - OPTIMIZED FOR STICKERS
const resizeImage = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Aggressive compression for sticker wall (60% quality)
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

const MovieCard: React.FC<MovieCardProps> = ({ movie, onBack, onEdit, onDelete, onUpdate }) => {
  const [activeSection, setActiveSection] = useState('movie-info');
  const [isStickerMode, setIsStickerMode] = useState(false);
  const [stickers, setStickers] = useState<string[]>(movie.screenshots || []);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  // Lightbox State
  const [viewingStickerIndex, setViewingStickerIndex] = useState<number | null>(null);

  // Extra Review State
  const [isExtraReviewEditorOpen, setIsExtraReviewEditorOpen] = useState(false);
  const [extraReviews, setExtraReviews] = useState<Review[]>(movie.extraReviews || []);
  const [currentReviewTitle, setCurrentReviewTitle] = useState('');
  const [currentReviewContent, setCurrentReviewContent] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  useEffect(() => {
    setStickers(movie.screenshots || []);
    setExtraReviews(movie.extraReviews || []);
  }, [movie]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['movie-info', 'gallery', 'reviews'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (viewingStickerIndex !== null) {
            if (e.key === 'Escape') setViewingStickerIndex(null);
            if (e.key === 'ArrowRight') handleNextSticker();
            if (e.key === 'ArrowLeft') handlePrevSticker();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingStickerIndex, stickers.length]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files) as File[];
          
          // Process all valid images
          const promises = files.map(file => resizeImage(file, 800));

          Promise.all(promises).then(newImages => {
              const updatedStickers = [...stickers, ...newImages];
              setStickers(updatedStickers);
              if(onUpdate) {
                  onUpdate({ ...movie, screenshots: updatedStickers });
              }
              // Reset input so same file can be selected again
              if (stickerInputRef.current) {
                  stickerInputRef.current.value = '';
              }
          }).catch(err => {
              console.error("Sticker upload failed", err);
              // alert("Failed to process some images."); // Removed as requested
          });
      }
  };

  const handleDeleteSticker = (index: number) => {
      const newStickers = stickers.filter((_, i) => i !== index);
      setStickers(newStickers);
      if (viewingStickerIndex === index) setViewingStickerIndex(null);
      if(onUpdate) {
          onUpdate({ ...movie, screenshots: newStickers });
      }
  }

  const handleNextSticker = () => {
      setViewingStickerIndex(prev => {
          if (prev === null) return null;
          return (prev + 1) % stickers.length;
      });
  };

  const handlePrevSticker = () => {
      setViewingStickerIndex(prev => {
          if (prev === null) return null;
          return (prev - 1 + stickers.length) % stickers.length;
      });
  };

  const handleSaveExtraReview = () => {
      if (!currentReviewTitle && !currentReviewContent) {
          setIsExtraReviewEditorOpen(false);
          return;
      }

      let updatedReviews = [...extraReviews];
      const newReview: Review = {
          id: editingReviewId || Date.now().toString(),
          title: currentReviewTitle || 'Untitled Review',
          content: currentReviewContent,
          date: new Date().toISOString().split('T')[0]
      };

      if (editingReviewId) {
          updatedReviews = updatedReviews.map(r => r.id === editingReviewId ? newReview : r);
      } else {
          updatedReviews.push(newReview);
      }

      setExtraReviews(updatedReviews);
      if (onUpdate) {
          onUpdate({ ...movie, extraReviews: updatedReviews });
      }
      
      setIsExtraReviewEditorOpen(false);
      setEditingReviewId(null);
      setCurrentReviewTitle('');
      setCurrentReviewContent('');
  };

  const handleEditExtraReview = (review: Review) => {
      setEditingReviewId(review.id);
      setCurrentReviewTitle(review.title);
      setCurrentReviewContent(review.content);
      setIsExtraReviewEditorOpen(true);
  };

  const handleDeleteExtraReview = (id: string) => {
      if (window.confirm('Delete this review?')) {
          const updatedReviews = extraReviews.filter(r => r.id !== id);
          setExtraReviews(updatedReviews);
          if (onUpdate) {
              onUpdate({ ...movie, extraReviews: updatedReviews });
          }
      }
  }

  // Sticker Wall Mode (Blank Black Interface)
  if (isStickerMode) {
      return (
          <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col animate-fade-in">
              {/* Sticker Toolbar */}
              <div className="p-6 flex justify-between items-center border-b border-white/10 bg-neutral-900">
                  <button onClick={() => setIsStickerMode(false)} className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white flex items-center gap-2">
                      <span>&larr;</span> Back to Details
                  </button>
                  <h2 className="font-heading text-xl tracking-widest">STICKER WALL</h2>
                  <button 
                    onClick={() => stickerInputRef.current?.click()}
                    className="bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
                  >
                      + Upload Stickers
                  </button>
                  <input type="file" multiple ref={stickerInputRef} onChange={handleStickerUpload} accept="image/*" className="hidden" />
              </div>
              
              {/* Sticker Canvas */}
              <div className="flex-1 p-12 overflow-y-auto bg-[#050505] relative">
                  {stickers.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-30">
                          <span className="text-6xl mb-4 font-serif">Empty</span>
                          <span className="text-sm font-mono uppercase tracking-widest">Add screenshots or photos here</span>
                      </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                      {stickers.map((sticker, idx) => (
                          <div 
                              key={idx} 
                              className="relative group transition-transform duration-300 hover:scale-105 cursor-zoom-in"
                              onClick={() => setViewingStickerIndex(idx)}
                          >
                              {/* Raw Image without Base Plate */}
                              <img src={sticker} className="w-full h-auto object-contain" alt={`Sticker ${idx}`} />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteSticker(idx); }}
                                className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Delete Image"
                              >
                                  &times;
                              </button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Lightbox Viewer */}
              {viewingStickerIndex !== null && (
                  <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center animate-fade-in">
                      {/* Close Button */}
                      <button 
                          onClick={() => setViewingStickerIndex(null)}
                          className="absolute top-6 right-8 text-white/50 hover:text-white transition-colors"
                      >
                           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>

                      {/* Main Image */}
                      <div className="max-w-[90vw] max-h-[85vh]">
                          <img 
                              src={stickers[viewingStickerIndex]} 
                              alt="Fullscreen" 
                              className="max-w-full max-h-[85vh] object-contain shadow-2xl" 
                          />
                          <div className="mt-4 text-center font-mono text-xs text-neutral-500 tracking-widest">
                              {viewingStickerIndex + 1} / {stickers.length}
                          </div>
                      </div>

                      {/* Navigation Controls */}
                      <button 
                          onClick={(e) => { e.stopPropagation(); handlePrevSticker(); }}
                          className="absolute left-4 md:left-12 p-4 text-white/30 hover:text-white transition-colors hover:bg-white/5 rounded-full"
                      >
                           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleNextSticker(); }}
                          className="absolute right-4 md:right-12 p-4 text-white/30 hover:text-white transition-colors hover:bg-white/5 rounded-full"
                      >
                           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                  </div>
              )}
          </div>
      );
  }

  // Extra Review Editor Mode
  if (isExtraReviewEditorOpen) {
      return (
          <div className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col animate-slide-up">
              <div className="p-8 border-b border-white/10 flex justify-between items-center bg-neutral-900/80 backdrop-blur-md">
                  <button onClick={() => setIsExtraReviewEditorOpen(false)} className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white">
                      Cancel
                  </button>
                  <div className="text-xs font-mono text-neutral-600 uppercase">ADDITIONAL NOTES</div>
                  <button onClick={handleSaveExtraReview} className="bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200">
                      Save Note
                  </button>
              </div>
              <div className="flex-1 max-w-3xl mx-auto w-full p-12 overflow-y-auto">
                  <div className="space-y-8">
                      <div className="relative">
                        <input 
                            type="text" 
                            value={currentReviewTitle}
                            onChange={(e) => setCurrentReviewTitle(e.target.value)}
                            placeholder="Title (Optional)"
                            className="w-full bg-transparent text-4xl font-heading text-white placeholder-neutral-700 focus:outline-none border-b border-transparent focus:border-white/20 pb-2 transition-colors"
                        />
                        <div className="absolute right-0 top-2">
                            <ClearBtn onClick={() => setCurrentReviewTitle('')} visible={!!currentReviewTitle} />
                        </div>
                      </div>
                      <div className="relative">
                        <textarea 
                            value={currentReviewContent}
                            onChange={(e) => setCurrentReviewContent(e.target.value)}
                            placeholder="Write your additional thoughts here..."
                            className="w-full h-[60vh] bg-transparent text-lg font-serif leading-loose text-neutral-300 placeholder-neutral-700 focus:outline-none resize-none"
                        />
                        <div className="absolute right-0 top-0">
                             <button 
                                onClick={() => setCurrentReviewContent('')} 
                                className={`text-[10px] uppercase font-bold text-neutral-600 hover:text-red-500 transition-colors ${currentReviewContent ? 'opacity-100' : 'opacity-0'}`}
                            >
                                CLEAR ALL
                            </button>
                        </div>
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  // Main Details View
  return (
    <div className="animate-fade-in pb-32 w-full text-left">
      
      {/* 1. IMMERSIVE HERO */}
      <div className="relative w-full h-[75vh] bg-black">
          {/* Navigation Overlay */}
          <div className="absolute top-0 left-0 w-full z-20 p-8 flex justify-between items-start">
               <button 
                onClick={onBack}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all duration-300 border border-white/10"
                title="Back to Library"
               >
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
               </button>

               <div className="flex gap-4">
                   <button 
                    onClick={() => onEdit(movie)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white hover:text-black transition-all duration-300 border border-white/10"
                    title="Edit"
                   >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                   </button>
                   <button 
                    onClick={() => onDelete(movie.id)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-red-600 hover:text-white transition-all duration-300 border border-white/10"
                    title="Delete"
                   >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                   </button>
               </div>
          </div>

          {/* Hero Image */}
          <div className="w-full h-full relative">
              {movie.coverImage ? (
                  <img src={movie.coverImage} className="w-full h-full object-cover" alt="Hero" />
              ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center border border-white/5">
                      <span className="font-heading text-neutral-800 text-6xl tracking-tighter uppercase">No Signal</span>
                  </div>
              )}
              {/* Cinematic Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
              
              {/* Title Overlay on Image */}
              <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 pb-16 bg-gradient-to-t from-black via-black/80 to-transparent">
                   <div className="max-w-7xl mx-auto w-full">
                       <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-2 tracking-tight leading-none">
                           {movie.title}
                       </h1>
                       <div className="flex flex-wrap items-end gap-6">
                           {movie.chineseTitle && (
                               <h2 className="text-xl md:text-2xl font-serif italic text-white/70">{movie.chineseTitle}</h2>
                           )}
                           <div className="flex items-center gap-2">
                                <span className="font-heading text-2xl text-white">{movie.rating.toFixed(1)}</span>
                           </div>
                       </div>
                   </div>
              </div>
          </div>
      </div>

      {/* 2. STICKY GUIDE NAVIGATION */}
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 mb-12">
          <div className="max-w-7xl mx-auto px-8 md:px-12 flex gap-8 py-4 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => scrollToSection('movie-info')}
                className={`text-[10px] uppercase font-bold tracking-[0.2em] transition-colors whitespace-nowrap ${activeSection === 'movie-info' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                  01. Movie Info
              </button>
              <button 
                onClick={() => scrollToSection('gallery')}
                className={`text-[10px] uppercase font-bold tracking-[0.2em] transition-colors whitespace-nowrap ${activeSection === 'gallery' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                  02. Gallery
              </button>
              <button 
                onClick={() => scrollToSection('reviews')}
                className={`text-[10px] uppercase font-bold tracking-[0.2em] transition-colors whitespace-nowrap ${activeSection === 'reviews' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                  03. Reviews
              </button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 md:px-12">
          
          {/* SECTION 01: INFO */}
          <div id="movie-info" className="py-12 border-b border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                   {/* Meta Column */}
                   <div className="space-y-8">
                       <div>
                           <div className="text-[10px] font-mono uppercase text-neutral-500 mb-2 tracking-widest">Director</div>
                           <div className="text-xl font-heading text-white">{movie.director || 'Unknown'}</div>
                       </div>
                       <div>
                           <div className="text-[10px] font-mono uppercase text-neutral-500 mb-2 tracking-widest">Production</div>
                           <div className="text-white font-serif">{movie.releaseYear} &bull; {movie.country || 'International'}</div>
                       </div>
                       <div>
                           <div className="text-[10px] font-mono uppercase text-neutral-500 mb-2 tracking-widest">Genres</div>
                           <div className="flex flex-wrap gap-2">
                               {movie.genres?.map(g => (
                                   <span key={g} className="text-xs border border-neutral-800 px-2 py-1 text-neutral-400">{g}</span>
                               ))}
                           </div>
                       </div>
                       <div>
                            <div className="text-[10px] font-mono uppercase text-neutral-500 mb-2 tracking-widest">Log Date</div>
                            <div className="text-white font-mono text-sm">{movie.watchedDate}</div>
                       </div>
                   </div>

                   {/* Overview / Links Column */}
                   <div className="md:col-span-2 space-y-8">
                        {movie.externalLink && (
                            <div className="p-6 border border-white/10 bg-neutral-900/30 flex items-center justify-between hover:bg-neutral-900 transition-colors group">
                                <div>
                                    <div className="text-[10px] font-mono uppercase text-neutral-500 mb-1">External Source</div>
                                    <div className="text-white font-serif italic truncate max-w-xs md:max-w-md">{movie.externalLink}</div>
                                </div>
                                <a href={movie.externalLink} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-widest bg-white text-black px-4 py-2 hover:bg-neutral-200">
                                    Visit
                                </a>
                            </div>
                        )}
                   </div>
              </div>
          </div>

          {/* SECTION 02: GALLERY */}
          <div id="gallery" className="py-16 border-b border-white/5">
              <div className="flex justify-between items-end mb-8">
                  <h3 className="text-4xl font-heading text-white">Visual Archive</h3>
                  <button 
                    onClick={() => setIsStickerMode(true)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-colors"
                  >
                      <span>Enter Sticker Wall</span>
                      <span>&rarr;</span>
                  </button>
              </div>
              
              {stickers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stickers.slice(0, 4).map((img, i) => (
                          <div key={i} className="aspect-square bg-neutral-900 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsStickerMode(true)}>
                              <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                      ))}
                      {stickers.length > 4 && (
                          <div className="aspect-square bg-neutral-900 flex items-center justify-center cursor-pointer hover:bg-neutral-800 border border-white/5" onClick={() => setIsStickerMode(true)}>
                              <span className="text-xl font-heading text-neutral-500">+{stickers.length - 4}</span>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="h-48 border border-dashed border-neutral-800 flex flex-col items-center justify-center text-neutral-600 gap-4">
                      <span className="font-serif italic opacity-50">No screenshots added yet.</span>
                      <button onClick={() => setIsStickerMode(true)} className="text-xs uppercase font-bold tracking-widest hover:text-white">Add Images</button>
                  </div>
              )}
          </div>

          {/* SECTION 03: REVIEWS */}
          <div id="reviews" className="py-16">
              <h3 className="text-4xl font-heading text-white mb-12">Reviews & Notes</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                  {/* Left: User Review (Director's Log) */}
                  <div className="lg:col-span-2 space-y-12">
                      {movie.userReview ? (
                          <article className="prose prose-invert prose-lg max-w-none">
                              <div className="text-[10px] font-mono uppercase text-neutral-500 mb-4 tracking-widest border-l-2 border-white pl-4">Director's Log</div>
                              <div className="whitespace-pre-wrap font-serif leading-relaxed text-neutral-300">
                                  {movie.userReview}
                              </div>
                          </article>
                      ) : (
                          <div className="opacity-30 italic font-serif">No personal log entry.</div>
                      )}

                      {/* Video Embed */}
                      {movie.videoLink && (
                          <div className="mt-8">
                               <div className="text-[10px] font-mono uppercase text-neutral-500 mb-4 tracking-widest border-l-2 border-red-500 pl-4">Video Reference</div>
                               <div className="p-8 bg-neutral-900 border border-white/5 flex items-center justify-center">
                                   <a href={movie.videoLink} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-4 group">
                                       <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                                           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                       </div>
                                       <span className="text-xs font-bold uppercase tracking-widest group-hover:text-white text-neutral-400">Watch Video</span>
                                       <span className="text-[10px] font-mono text-neutral-600 max-w-md truncate">{movie.videoLink}</span>
                                   </a>
                               </div>
                          </div>
                      )}
                  </div>

                  {/* Right: External & Extra */}
                  <div className="space-y-12">
                      {/* External Content */}
                      {(movie.externalReview || movie.externalReviewAnnotation) && (
                          <div className="bg-neutral-900/30 border border-white/5 p-8 relative">
                              <div className="absolute top-0 left-0 bg-neutral-800 text-[9px] font-bold uppercase text-neutral-400 px-3 py-1">Reference</div>
                              
                              {movie.externalReviewAnnotation && (
                                  <div className="mb-6 pb-6 border-b border-white/5">
                                      <div className="text-[9px] font-mono uppercase text-neutral-500 mb-2">Annotation</div>
                                      <div className="font-serif italic text-white/80">"{movie.externalReviewAnnotation}"</div>
                                  </div>
                              )}
                              
                              {movie.externalReview && (
                                  <div className="text-sm font-serif leading-relaxed text-neutral-400 line-clamp-[10]">
                                      {movie.externalReview}
                                  </div>
                              )}
                          </div>
                      )}

                      {/* Extra Reviews (Appendices) */}
                      <div>
                          <div className="flex justify-between items-center mb-6">
                              <h4 className="text-xl font-heading text-white">Appendices</h4>
                              <button 
                                onClick={() => {
                                    setEditingReviewId(null);
                                    setCurrentReviewTitle('');
                                    setCurrentReviewContent('');
                                    setIsExtraReviewEditorOpen(true);
                                }}
                                className="text-[10px] uppercase font-bold tracking-widest hover:text-white text-neutral-500"
                              >
                                  + Add Note
                              </button>
                          </div>

                          <div className="space-y-4">
                              {extraReviews.map(review => (
                                  <div 
                                    key={review.id} 
                                    className="p-6 bg-neutral-900 border-l-2 border-neutral-700 hover:border-white transition-colors cursor-pointer group"
                                    onClick={() => handleEditExtraReview(review)}
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <h5 className="font-bold text-sm text-neutral-300 group-hover:text-white">{review.title}</h5>
                                          <span className="text-[9px] font-mono text-neutral-600">{review.date}</span>
                                      </div>
                                      <p className="text-xs text-neutral-500 line-clamp-2 font-serif">{review.content}</p>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteExtraReview(review.id); }}
                                        className="mt-4 text-[9px] text-red-900 hover:text-red-500 uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          Delete
                                      </button>
                                  </div>
                              ))}
                              {extraReviews.length === 0 && (
                                  <div className="text-xs text-neutral-600 italic">No additional notes.</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default MovieCard;