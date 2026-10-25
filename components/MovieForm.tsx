import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Movie } from '../types';
import RatingInput from './RatingInput';
import { getMovieDetails } from '../services/geminiService';

export interface MovieFormHandle {
  submit: () => void;
}

interface MovieFormProps {
  onSave: (movie: Movie) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  initialData?: Movie;
}

// Common genres
const GENRE_LIST = [
  "Drama", "Action", "Sci-Fi", "Thriller", "Adventure", "Comedy", 
  "Crime", "Mystery", "Horror", "Romance", "Animation", "Fantasy", 
  "Documentary", "War", "History", "Music", "Biography", "Family"
];

const ClearBtn = ({ onClick, visible }: { onClick: () => void, visible: boolean }) => (
    <button 
        type="button" 
        onClick={onClick} 
        className={`absolute right-0 bottom-3 text-neutral-600 hover:text-red-500 transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
        title="Clear"
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
);

// Helper to resize images - OPTIMIZED FOR MANY PHOTOS
const resizeImage = (file: File, maxWidth = 1000): Promise<string> => {
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
                // Compress to JPEG at 70% quality
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

const MovieForm = forwardRef<MovieFormHandle, MovieFormProps>(({ onSave, onCancel, onDelete, initialData }, ref) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [chineseTitle, setChineseTitle] = useState(initialData?.chineseTitle || '');
  const [releaseYear, setReleaseYear] = useState(initialData?.releaseYear || '');
  const [director, setDirector] = useState(initialData?.director || '');
  const [country, setCountry] = useState(initialData?.country || '');
  const [genres, setGenres] = useState<string[]>(initialData?.genres || []);
  const [watchedDate, setWatchedDate] = useState(
    initialData?.watchedDate || new Date().toISOString().split('T')[0]
  );
  const [rating, setRating] = useState(initialData?.rating || 0); 
  
  // Editorial Content
  const [userReview, setUserReview] = useState(initialData?.userReview || '');
  const [videoLink, setVideoLink] = useState(initialData?.videoLink || '');
  
  const [externalReview, setExternalReview] = useState(initialData?.externalReview || '');
  const [externalLink, setExternalLink] = useState(initialData?.externalLink || '');
  const [externalReviewAnnotation, setExternalReviewAnnotation] = useState(initialData?.externalReviewAnnotation || '');
  
  const [coverImage, setCoverImage] = useState<string | undefined>(initialData?.coverImage);
  const [posterImage, setPosterImage] = useState<string | undefined>(initialData?.posterImage);
  const [screenshots] = useState<string[]>(initialData?.screenshots || []);
  
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'personal' | 'external'>('personal');
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsDirty(true);
  }, [title, chineseTitle, releaseYear, director, country, genres, watchedDate, rating, userReview, videoLink, externalReview, externalLink, externalReviewAnnotation, coverImage, posterImage]);

  useEffect(() => {
      setIsDirty(false);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'poster') => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            // Resize cover to max 1024px, poster to max 600px to save space
            const resized = await resizeImage(file, type === 'cover' ? 1024 : 600);
            if (type === 'cover') setCoverImage(resized);
            else setPosterImage(resized);
        } catch (error) {
            console.error("Image processing failed", error);
            alert("Failed to process image.");
        }
    }
  };

  const toggleGenre = (genre: string) => {
    setGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const handleAutoFill = async () => {
    if (!title) return;
    setIsFetchingDetails(true);
    const details = await getMovieDetails(title);
    if (details) {
      setReleaseYear(details.year);
      setDirector(details.director);
      setCountry(details.country);
      setExternalReview(details.summary); // Auto-fill summary into external content
      setChineseTitle(details.chineseTitle);
      const newGenres = Array.from(new Set([...genres, ...details.genres]));
      setGenres(newGenres);
    }
    setIsFetchingDetails(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title) return;

    const movieData: Movie = {
      id: initialData?.id || Date.now().toString(),
      title,
      chineseTitle,
      releaseYear,
      director,
      country,
      genres,
      watchedDate,
      rating,
      userReview,
      videoLink,
      externalReview,
      externalLink,
      externalReviewAnnotation,
      coverImage,
      posterImage,
      screenshots,
      extraReviews: initialData?.extraReviews || [],
      timestamp: initialData?.timestamp || Date.now(),
    };

    onSave(movieData);
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
        handleSubmit();
    }
  }));

  const handleCancel = () => {
    if (isDirty) {
        if (window.confirm("Discard unsaved changes?")) {
            onCancel();
        }
    } else {
        onCancel();
    }
  };

  // Full Screen Editor Component
  if (isEditorOpen) {
      return (
          <div className="fixed inset-0 z-[100] bg-[#050505] text-neutral-200 flex flex-col animate-fade-in">
              {/* Editor Toolbar */}
              <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-neutral-900/50 backdrop-blur-xl">
                  <div className="flex items-center gap-8">
                      <button onClick={() => setIsEditorOpen(false)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">
                          <span>&larr;</span> Back
                      </button>
                      <div className="h-6 w-px bg-white/10"></div>
                      <div className="flex gap-6">
                          <button 
                            onClick={() => setEditorTab('personal')}
                            className={`text-xs font-bold uppercase tracking-widest transition-colors ${editorTab === 'personal' ? 'text-white underline underline-offset-8' : 'text-neutral-600 hover:text-neutral-400'}`}
                          >
                              Director's Log
                          </button>
                          <button 
                            onClick={() => setEditorTab('external')}
                            className={`text-xs font-bold uppercase tracking-widest transition-colors ${editorTab === 'external' ? 'text-white underline underline-offset-8' : 'text-neutral-600 hover:text-neutral-400'}`}
                          >
                              Reference Material
                          </button>
                      </div>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 uppercase">
                      {title ? title.toUpperCase() : 'UNTITLED PROJECT'}
                  </div>
                  <button onClick={() => setIsEditorOpen(false)} className="text-white text-xs font-bold uppercase tracking-widest hover:text-neutral-300">
                      Save & Close
                  </button>
              </div>

              {/* Editor Canvas */}
              <div className="flex-1 overflow-y-auto">
                  <div className="max-w-4xl mx-auto py-16 px-8 md:px-12">
                      {editorTab === 'personal' ? (
                          <div className="space-y-12 animate-fade-in">
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                     <label className="block text-xs font-mono text-neutral-500 uppercase tracking-widest">My Video / Script Content</label>
                                     <button onClick={() => setUserReview('')} className="text-[9px] text-neutral-600 hover:text-red-500 font-bold uppercase tracking-widest">Clear All</button>
                                  </div>
                                  <textarea
                                      value={userReview}
                                      onChange={(e) => setUserReview(e.target.value)}
                                      placeholder="Type your review, script, or notes here..."
                                      className="w-full min-h-[50vh] bg-transparent text-lg md:text-xl font-serif leading-loose text-white placeholder-neutral-700 focus:outline-none resize-none selection:bg-white/20"
                                  />
                              </div>
                              <div className="space-y-4 pt-8 border-t border-white/5 relative">
                                  <label className="block text-xs font-mono text-neutral-500 uppercase tracking-widest">Video Link (Embed)</label>
                                  <div className="relative">
                                    <input 
                                        type="text"
                                        value={videoLink}
                                        onChange={(e) => setVideoLink(e.target.value)}
                                        placeholder="Paste YouTube/Vimeo/Bilibili link here..."
                                        className="w-full bg-neutral-900/50 border border-neutral-800 p-4 text-sm text-white font-mono focus:border-white/30 focus:outline-none transition-colors"
                                    />
                                    {videoLink && (
                                        <button onClick={() => setVideoLink('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-red-500">
                                            &times;
                                        </button>
                                    )}
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-12 animate-fade-in">
                              
                              {/* Annotation Section */}
                              <div className="bg-neutral-900/30 border border-white/10 p-8 space-y-4 relative">
                                  <div className="absolute top-0 left-0 bg-white text-black text-[9px] font-bold uppercase px-2 py-1 tracking-widest">Editor's Note</div>
                                  <div className="flex justify-between items-center pt-2">
                                      <label className="block text-xs font-mono text-neutral-500 uppercase tracking-widest">My Comments on this material</label>
                                      <button onClick={() => setExternalReviewAnnotation('')} className="text-[9px] text-neutral-600 hover:text-red-500 font-bold uppercase tracking-widest">Clear</button>
                                  </div>
                                  <textarea
                                      value={externalReviewAnnotation}
                                      onChange={(e) => setExternalReviewAnnotation(e.target.value)}
                                      placeholder="Add your annotations or thoughts regarding the external content below..."
                                      className="w-full h-32 bg-transparent text-base font-serif italic text-neutral-300 placeholder-neutral-700 focus:outline-none resize-none"
                                  />
                              </div>

                              <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                      <label className="block text-xs font-mono text-neutral-500 uppercase tracking-widest">Imported Content (Copy/Paste)</label>
                                      <button onClick={() => setExternalReview('')} className="text-[9px] text-neutral-600 hover:text-red-500 font-bold uppercase tracking-widest">Clear All</button>
                                  </div>
                                  <textarea
                                      value={externalReview}
                                      onChange={(e) => setExternalReview(e.target.value)}
                                      placeholder="Paste external reviews, subtitles, or article text here..."
                                      className="w-full min-h-[40vh] bg-transparent text-base md:text-lg font-serif leading-loose text-neutral-400 placeholder-neutral-800 focus:outline-none resize-none pl-6 border-l border-neutral-800"
                                  />
                              </div>
                              
                              <div className="space-y-4 pt-8 border-t border-white/5 relative">
                                  <label className="block text-xs font-mono text-neutral-500 uppercase tracking-widest">Source Link</label>
                                  <div className="relative">
                                    <input 
                                        type="text"
                                        value={externalLink}
                                        onChange={(e) => setExternalLink(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-neutral-900/50 border border-neutral-800 p-4 text-sm text-neutral-400 font-mono focus:border-white/30 focus:outline-none transition-colors"
                                    />
                                    {externalLink && (
                                        <button onClick={() => setExternalLink('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-red-500">
                                            &times;
                                        </button>
                                    )}
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )
  }

  // Main Form Layout
  return (
    <div className="animate-slide-up max-w-4xl mx-auto pb-20 px-6 md:px-12 pt-12">
      <div className="flex items-baseline justify-between mb-12 border-b border-white/10 pb-6">
        <h2 className="text-5xl font-heading text-white tracking-tight">
          {initialData ? 'Edit Movie' : 'New Entry'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-16">
        
        {/* Images Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Vertical Poster */}
            <div className="md:col-span-1 space-y-3">
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Poster (Vertical)</label>
                <div 
                    className={`relative w-full aspect-[2/3] bg-cinema-900 border border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 group ${
                    posterImage ? 'border-transparent' : 'border-neutral-700 hover:border-white/30'
                    }`}
                    onClick={() => posterInputRef.current?.click()}
                >
                    {posterImage ? (
                        <img src={posterImage} alt="Poster" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                    <div className="flex flex-col items-center opacity-50 p-4 text-center">
                        <span className="text-[9px] text-neutral-400 tracking-widest uppercase leading-relaxed">Upload<br/>Poster</span>
                    </div>
                    )}
                    <input type="file" ref={posterInputRef} onChange={(e) => handleImageUpload(e, 'poster')} accept="image/*" className="hidden" />
                </div>
            </div>

            {/* Horizontal Cover */}
            <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                    <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Cover (Horizontal)</label>
                    {initialData && (
                        <button
                            type="button"
                            onClick={() => handleSubmit()} 
                            className="text-[10px] uppercase tracking-widest text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded transition-colors flex items-center gap-2"
                        >
                            <span>Save & Add Screenshots</span>
                            <span>&rarr;</span>
                        </button>
                    )}
                </div>
                <div 
                    className={`relative w-full aspect-[16/9] bg-cinema-900/50 border border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 group ${
                    coverImage ? 'border-transparent' : 'border-neutral-700 hover:border-white/30'
                    }`}
                    onClick={() => coverInputRef.current?.click()}
                >
                    {coverImage ? (
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                    <div className="flex flex-col items-center opacity-50">
                        <span className="text-[10px] text-neutral-400 tracking-widest uppercase">Upload Cover</span>
                    </div>
                    )}
                    <input type="file" ref={coverInputRef} onChange={(e) => handleImageUpload(e, 'cover')} accept="image/*" className="hidden" />
                </div>
            </div>
        </div>

        {/* Title & Auto-Fill */}
        <div className="space-y-10">
            <div className="group relative">
              <div className="flex justify-between items-end mb-2">
                 <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Movie Title</label>
                 <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!title || isFetchingDetails}
                  className="text-[10px] uppercase tracking-wider text-neutral-400 hover:text-white disabled:opacity-30 transition-colors border-b border-dashed border-neutral-600 hover:border-white pb-0.5"
                >
                  {isFetchingDetails ? 'Searching...' : 'Auto-Fill (Magic)'}
                </button>
              </div>
              
              <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent border-b border-neutral-800 py-4 text-5xl font-heading tracking-tight text-white focus:outline-none focus:border-white transition-colors placeholder-neutral-800 pr-8"
                    placeholder="Enter title..."
                    required
                  />
                  <ClearBtn onClick={() => setTitle('')} visible={!!title} />
              </div>
            </div>

            {/* Chinese Title */}
             <div className="group relative">
                <label className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2 font-bold">Original / Alternate Title</label>
                <div className="relative">
                    <input
                      type="text"
                      value={chineseTitle}
                      onChange={(e) => setChineseTitle(e.target.value)}
                      className="w-full bg-transparent border-b border-neutral-800 py-2 text-2xl font-heading text-neutral-300 focus:outline-none focus:border-white transition-colors placeholder-neutral-800 pr-8"
                      placeholder="e.g. Original Title"
                    />
                    <ClearBtn onClick={() => setChineseTitle('')} visible={!!chineseTitle} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="group relative">
                <label className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2 font-bold">Year</label>
                <div className="relative">
                    <input
                      type="text"
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(e.target.value)}
                      className="w-full bg-transparent border-b border-neutral-800 py-2 text-lg text-white focus:outline-none focus:border-white transition-colors placeholder-neutral-800 font-sans pr-8"
                      placeholder="YYYY"
                      required
                    />
                    <ClearBtn onClick={() => setReleaseYear('')} visible={!!releaseYear} />
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2 font-bold">Date Watched</label>
                <input
                  type="date"
                  value={watchedDate}
                  onChange={(e) => setWatchedDate(e.target.value)}
                  className="w-full bg-transparent border-b border-neutral-800 py-2 text-lg text-white focus:outline-none focus:border-white transition-colors placeholder-neutral-800 font-sans [color-scheme:dark]"
                  required
                />
              </div>
            </div>
            
            {/* Metadata Row */}
            <div className="space-y-8">
                 <div className="group relative">
                    <label className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2 font-bold">Director</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={director}
                            onChange={(e) => setDirector(e.target.value)}
                            className="w-full bg-transparent border-b border-neutral-800 py-2 text-lg text-white focus:outline-none focus:border-white transition-colors placeholder-neutral-800 font-sans pr-8"
                        />
                        <ClearBtn onClick={() => setDirector('')} visible={!!director} />
                    </div>
                </div>
                <div className="group">
                    <label className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-4 font-bold">Genres</label>
                    <div className="flex flex-wrap gap-2">
                        {GENRE_LIST.map(genre => (
                            <button
                                type="button"
                                key={genre}
                                onClick={() => toggleGenre(genre)}
                                className={`text-[10px] uppercase tracking-wider px-3 py-1 border transition-all duration-300 ${
                                    genres.includes(genre) 
                                        ? 'bg-white text-black border-white' 
                                        : 'bg-transparent text-neutral-500 border-neutral-800 hover:border-neutral-500'
                                }`}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Rating */}
        <div className="py-10 border-t border-b border-white/5">
            <RatingInput value={rating} onChange={setRating} />
        </div>

        {/* EDITORIAL SUITE ENTRY */}
        <div className="p-8 bg-neutral-900/30 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-white/30 transition-colors">
            <div>
                <h3 className="text-lg font-heading text-white mb-1">Editorial Suite</h3>
                <p className="text-xs text-neutral-500 font-mono">Manage reviews, scripts, videos, and external links.</p>
            </div>
            <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="px-6 py-3 bg-white text-black text-[10px] uppercase font-bold tracking-widest hover:bg-neutral-200 transition-colors"
            >
                Open Editor &rarr;
            </button>
        </div>

        {/* Actions */}
        <div className="pt-12 flex items-center gap-6">
             {initialData && onDelete && (
                <button
                    type="button"
                    onClick={() => onDelete(initialData.id)}
                    className="py-4 px-8 border border-red-900/30 text-red-900 hover:bg-red-950 hover:text-red-500 hover:border-red-900 transition-colors text-[10px] uppercase font-bold tracking-widest"
                >
                    Delete
                </button>
            )}

             {initialData && (
                 <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="py-4 px-8 bg-neutral-800 text-white hover:bg-neutral-700 transition-colors text-[10px] uppercase font-bold tracking-widest"
                >
                    Save & Jump to Details
                </button>
             )}

            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-4 text-neutral-500 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-widest"
            >
              Cancel
            </button>
        </div>
      </form>
    </div>
  );
});

export default MovieForm;