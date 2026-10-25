import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Movie } from '../types';

interface MovieListProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

type SortOption = 'recent' | 'oldest' | 'rating-desc' | 'rating-asc';
type LibraryView = 'stream' | 'gallery' | 'timeline';
type StreamLayout = 'carousel' | 'list';

const MovieList: React.FC<MovieListProps> = ({ movies, onSelectMovie }) => {
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentView, setCurrentView] = useState<LibraryView>('gallery'); // Default to Gallery
  const [streamLayout, setStreamLayout] = useState<StreamLayout>('carousel');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGenreMenuOpen, setIsGenreMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const genreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreMenuRef.current && !genreMenuRef.current.contains(event.target as Node)) {
        setIsGenreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    movies.forEach(m => m.genres?.forEach(g => genres.add(g)));
    return Array.from(genres).sort();
  }, [movies]);

  const filteredAndSortedMovies = useMemo(() => {
    let result = [...movies];
    
    // Search Filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(m => 
            m.title.toLowerCase().includes(q) || 
            (m.chineseTitle && m.chineseTitle.toLowerCase().includes(q)) ||
            (m.director && m.director.toLowerCase().includes(q))
        );
    }

    // Genre Filter (Multi-select OR logic)
    if (selectedGenres.length > 0) {
      result = result.filter(m => m.genres?.some(g => selectedGenres.includes(g)));
    }

    // Sorting
    if (sortOption === 'recent') {
      result.sort((a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.watchedDate).getTime() - new Date(b.watchedDate).getTime());
    } else if (sortOption === 'rating-desc') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === 'rating-asc') {
      result.sort((a, b) => a.rating - b.rating);
    }
    return result;
  }, [movies, sortOption, selectedGenres, searchQuery]);

  // Calendar Logic
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
  
  const calendarDays = useMemo(() => {
    const days: { date: number; movies: Movie[] }[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push({ date: 0, movies: [] });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const currentDateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const moviesOnDay = movies.filter(m => m.watchedDate === currentDateStr);
        days.push({ date: i, movies: moviesOnDay });
    }
    return days;
  }, [calendarDate, movies]);

  const handlePrevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  const monthName = calendarDate.toLocaleString('en-US', { month: 'long' });
  const yearNum = calendarDate.getFullYear();

  const toggleSearch = () => {
      setIsSearchOpen(!isSearchOpen);
      if (!isSearchOpen) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
          setSearchQuery('');
      }
  };

  const toggleGenre = (genre: string) => {
      setSelectedGenres(prev => 
          prev.includes(genre) 
              ? prev.filter(g => g !== genre)
              : [...prev, genre]
      );
  };

  if (movies.length === 0) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center px-6 animate-fade-in">
        <div className="w-12 h-px bg-white/20 mb-8"></div>
        <h3 className="text-4xl md:text-5xl font-heading text-white mb-6 italic tracking-tight">Archive Empty</h3>
        <p className="text-neutral-500 text-xs font-serif italic tracking-widest">Begin your cinematic collection</p>
      </div>
    );
  }

  return (
    <div 
        className="animate-slide-up w-full h-full flex flex-col" 
        ref={containerRef}
    >
      {/* Control Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pt-8 pb-6 px-8 md:px-12 border-b border-white/5">
          
          {/* View Switcher (GALLERY | STREAM | TIMELINE) - Reordered */}
          <div className="flex gap-8 overflow-x-auto no-scrollbar items-center">
            <button onClick={() => setCurrentView('gallery')} className={`text-[10px] uppercase tracking-[0.25em] pb-2 transition-all font-bold whitespace-nowrap ${currentView === 'gallery' ? 'text-white border-b border-white' : 'text-neutral-600 border-transparent'}`}>GALLERY</button>
            <button onClick={() => setCurrentView('stream')} className={`text-[10px] uppercase tracking-[0.25em] pb-2 transition-all font-bold whitespace-nowrap ${currentView === 'stream' ? 'text-white border-b border-white' : 'text-neutral-600 border-transparent'}`}>STREAM</button>
            <button onClick={() => setCurrentView('timeline')} className={`text-[10px] uppercase tracking-[0.25em] pb-2 transition-all font-bold whitespace-nowrap ${currentView === 'timeline' ? 'text-white border-b border-white' : 'text-neutral-600 border-transparent'}`}>TIMELINE</button>
          </div>

          <div className="flex flex-wrap items-center gap-6">
              
              {/* Stream Layout Toggle (Only in Stream mode) */}
              {currentView === 'stream' && (
                  <div className="flex bg-neutral-900 rounded-lg p-1 border border-white/10">
                      <button 
                        onClick={() => setStreamLayout('carousel')}
                        className={`p-1 rounded ${streamLayout === 'carousel' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                        title="Carousel View"
                      >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
                      </button>
                      <button 
                        onClick={() => setStreamLayout('list')}
                        className={`p-1 rounded ${streamLayout === 'list' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                        title="List View"
                      >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                      </button>
                  </div>
              )}

              {/* Search Toggle */}
              <div className={`flex items-center bg-neutral-900/30 border ${isSearchOpen ? 'border-white/30 w-56 px-3' : 'border-transparent w-8 justify-center'} h-8 rounded-full transition-all duration-300 overflow-hidden`}>
                  <button onClick={toggleSearch} className="text-neutral-500 hover:text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`bg-transparent border-none outline-none text-white text-xs ml-2 w-full font-sans placeholder-neutral-600 ${isSearchOpen ? 'opacity-100' : 'opacity-0'}`}
                    placeholder="Search..."
                  />
              </div>

              {/* Multi-Select Genre Filter */}
              <div className="relative" ref={genreMenuRef}>
                  <button 
                      onClick={() => setIsGenreMenuOpen(!isGenreMenuOpen)}
                      className={`text-[9px] uppercase tracking-widest font-bold focus:outline-none transition-colors flex items-center gap-2 ${selectedGenres.length > 0 ? 'text-white' : 'text-neutral-500 hover:text-white'}`}
                  >
                      <span>{selectedGenres.length > 0 ? `${selectedGenres.length} GENRES` : 'GENRES'}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isGenreMenuOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
                  </button>

                  {isGenreMenuOpen && (
                      <div className="absolute top-full right-0 mt-4 w-48 bg-[#0a0a0a] border border-white/10 rounded-sm shadow-2xl z-50 max-h-60 overflow-y-auto animate-fade-in">
                          <div className="p-2 space-y-1">
                              {allGenres.map(g => (
                                  <div 
                                    key={g} 
                                    onClick={() => toggleGenre(g)}
                                    className={`flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-wide cursor-pointer transition-colors ${selectedGenres.includes(g) ? 'text-white bg-white/5' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
                                  >
                                      <div className={`w-3 h-3 border flex items-center justify-center transition-colors ${selectedGenres.includes(g) ? 'border-white bg-white' : 'border-neutral-700'}`}>
                                          {selectedGenres.includes(g) && <svg width="8" height="8" viewBox="0 0 24 24" stroke="black" strokeWidth="4" fill="none"><polyline points="20 6 9 17 4 12"/></svg>}
                                      </div>
                                      <span>{g}</span>
                                  </div>
                              ))}
                              {allGenres.length === 0 && <div className="p-4 text-[10px] text-neutral-600 text-center font-mono">No genres found</div>}
                          </div>
                      </div>
                  )}
              </div>

              {/* Sort Options */}
              <select 
                  value={sortOption} 
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-transparent text-[9px] uppercase tracking-widest font-bold text-neutral-500 focus:outline-none cursor-pointer hover:text-white transition-colors"
              >
                  <option value="recent" className="bg-black">Recent</option>
                  <option value="oldest" className="bg-black">Oldest</option>
                  <option value="rating-desc" className="bg-black">High Rated</option>
              </select>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        
        {/* 2. GALLERY MODE (Grid of Horizontal Cards) - DEFAULT VIEW */}
        {currentView === 'gallery' && (
            <div className="px-8 md:px-12 pt-8 pb-12">
                <div className="grid gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAndSortedMovies.map((movie) => (
                        <div 
                            key={movie.id} 
                            onClick={() => onSelectMovie(movie)}
                            className="group cursor-pointer flex flex-col"
                        >
                            <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden border border-neutral-900 group-hover:border-neutral-700 transition-colors">
                                {movie.coverImage ? (
                                    <img src={movie.coverImage} alt={movie.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="font-heading text-neutral-800 text-xl">{movie.title.charAt(0)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 border-t border-neutral-900 pt-3 text-left">
                                <div className="flex items-baseline justify-between mb-1">
                                    <h4 className="text-lg font-heading text-white group-hover:text-white/90 truncate pr-4">{movie.title}</h4>
                                    <span className="font-serif italic text-xs text-neutral-500">{movie.rating.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-widest text-neutral-600">
                                    <span>{movie.releaseYear}</span>
                                    <span className="w-px h-2 bg-neutral-800"></span>
                                    <span className="truncate">{movie.director || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* 1. STREAM MODE - Full Width */}
        {currentView === 'stream' && (
            <div className="flex flex-col justify-center min-h-[50vh]">
               {streamLayout === 'carousel' ? (
                   // LAYOUT A: Horizontal Scroll (Book) - Full Width
                   <div className="flex gap-10 overflow-x-auto pb-12 pt-8 snap-x snap-mandatory items-center px-8 md:px-12 no-scrollbar">
                       {filteredAndSortedMovies.map((movie) => (
                           <div 
                               key={movie.id} 
                               onClick={() => onSelectMovie(movie)}
                               className="snap-center shrink-0 flex flex-col gap-3 cursor-pointer group w-[130px]"
                           >
                               <div className="aspect-[2/3] w-full bg-neutral-900 relative overflow-hidden shadow-2xl rounded-sm transition-transform duration-500 group-hover:scale-[1.05] group-hover:-translate-y-2 border border-white/5">
                                   {movie.posterImage ? (
                                       <img src={movie.posterImage} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                       <div className="w-full h-full flex items-center justify-center text-neutral-800 text-xs font-heading border border-neutral-900">{movie.title.charAt(0)}</div>
                                   )}
                                   <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                                     {movie.rating.toFixed(1)}
                                   </div>
                               </div>
                               <div className="flex flex-col items-start text-left px-1">
                                   <h3 className="text-xs font-bold text-white group-hover:text-neutral-300 transition-colors tracking-wide leading-tight mb-1 truncate w-full font-heading">
                                       {movie.title}
                                   </h3>
                                   <div className="flex items-center gap-2 text-[8px] text-neutral-500 font-mono uppercase tracking-widest w-full">
                                       <span>{movie.releaseYear}</span>
                                       <span className="w-px h-2 bg-neutral-800"></span>
                                       <span className="truncate">{movie.genres?.[0]}</span>
                                   </div>
                               </div>
                           </div>
                       ))}
                       <div className="w-12 shrink-0"></div>
                   </div>
               ) : (
                   // LAYOUT B: STANDARD FRAMED LIST (Clean, Original)
                   <div className="flex flex-col w-full max-w-5xl mx-auto gap-4 px-6 md:px-12 pb-12 pt-8">
                       {filteredAndSortedMovies.map((movie) => (
                           <div 
                                key={movie.id}
                                onClick={() => onSelectMovie(movie)}
                                className="group flex items-center gap-6 p-4 border border-white/5 hover:border-white/20 bg-neutral-900/30 hover:bg-neutral-900 transition-all cursor-pointer rounded-sm"
                           >
                                {/* Frame Poster */}
                                <div className="w-16 h-24 shrink-0 bg-neutral-950 relative border border-neutral-800 group-hover:border-white/40 transition-colors">
                                    {movie.posterImage ? (
                                        <img src={movie.posterImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-700 font-heading">NO IMG</div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-3 mb-2">
                                        <h3 className="text-lg font-heading font-bold text-white truncate group-hover:text-neutral-300 transition-colors">
                                            {movie.title}
                                        </h3>
                                        <span className="text-sm font-serif italic text-neutral-500 hidden md:inline">{movie.chineseTitle}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                                        <span className="text-neutral-400">{movie.releaseYear}</span>
                                        <span className="w-px h-3 bg-neutral-700"></span>
                                        <span className="truncate max-w-[200px]">{movie.director || 'Unknown'}</span>
                                    </div>
                                </div>

                                {/* Rating */}
                                <div className="text-xl font-heading text-neutral-500 group-hover:text-white transition-colors">
                                    {movie.rating.toFixed(1)}
                                </div>
                           </div>
                       ))}
                   </div>
               )}
            </div>
        )}

        {/* 3. TIMELINE MODE (Calendar Grid) */}
        {currentView === 'timeline' && (
            <div className="w-full max-w-5xl mx-auto px-8 md:px-12 pt-8">
                 <div className="flex justify-between items-center mb-6 text-white">
                    <button onClick={handlePrevMonth} className="hover:opacity-70 transition-opacity text-xl">&larr;</button>
                    <span className="font-heading text-2xl tracking-widest">{monthName} {yearNum}</span>
                    <button onClick={handleNextMonth} className="hover:opacity-70 transition-opacity text-xl">&rarr;</button>
                </div>
                <div className="grid grid-cols-7 gap-px bg-neutral-900 border border-neutral-900">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(day => (
                        <div key={day} className="text-center py-4 bg-black text-xs text-neutral-600 font-serif">{day}</div>
                    ))}
                    {calendarDays.map((day, idx) => (
                        <div key={idx} className="bg-black min-h-[100px] p-3 relative hover:bg-[#050505] transition-colors group border-t border-l border-neutral-900/50">
                            {day.date > 0 && (
                                <>
                                    <div className={`text-[10px] mb-2 font-mono ${day.movies.length > 0 ? 'text-white' : 'text-neutral-800'}`}>
                                        {day.date}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {day.movies.map(movie => (
                                            <div 
                                                key={movie.id} 
                                                onClick={(e) => { e.stopPropagation(); onSelectMovie(movie); }}
                                                className="cursor-pointer truncate pl-2 border-l border-neutral-800 hover:border-white transition-colors text-left"
                                            >
                                                <span className="text-[9px] text-neutral-500 hover:text-white transition-colors font-serif leading-tight block truncate">
                                                    {movie.chineseTitle || movie.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default MovieList;