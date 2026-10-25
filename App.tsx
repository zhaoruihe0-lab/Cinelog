import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import MovieList from './components/MovieList';
import MovieForm, { MovieFormHandle } from './components/MovieForm';
import MovieCard from './components/MovieCard';
import Profile from './components/Profile';
import { Movie, ViewState } from './types';
import { storage } from './services/storage';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('library');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieToEdit, setMovieToEdit] = useState<Movie | undefined>(undefined);
  
  // Share & Read-Only states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detect read-only mode from URL query parameters (?mode=readonly or ?view=readonly)
  const isReadOnly = typeof window !== 'undefined' && (() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || params.get('view');
    return mode === 'readonly' || mode === 'read';
  })();

  const formRef = useRef<MovieFormHandle>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  // Load movies from DB (with Migration check) on mount
  useEffect(() => {
    const initData = async () => {
        // 1. Check for legacy LocalStorage data
        const localMovies = localStorage.getItem('cineLogMovies');
        if (localMovies) {
            try {
                console.log("Migrating data from LocalStorage to IndexedDB...");
                const parsed = JSON.parse(localMovies);
                await storage.saveMovies(parsed);
                localStorage.removeItem('cineLogMovies');
            } catch (e) {
                console.error("Migration failed", e);
            }
        }

        // 2. Load from IndexedDB
        try {
            const dbMovies = await storage.getMovies();
            setMovies(dbMovies || []);
        } catch (e) {
            console.error("Failed to load movies from DB", e);
            setMovies([]);
        }
    };

    initData();
  }, []);

  // Save movies to DB whenever they change (ONLY if not in read-only mode)
  useEffect(() => {
    if (!isReadOnly && movies.length > 0) {
        storage.saveMovies(movies).catch(err => console.error("DB Save Failed:", err));
    }
  }, [movies, isReadOnly]);

  const handleSaveMovie = (movieData: Movie) => {
    if (isReadOnly) {
      showToast("只读模式已锁定：无法添加或修改电影记录。");
      return;
    }

    if (movieToEdit) {
      // Update existing
      setMovies((prev) => prev.map(m => m.id === movieData.id ? movieData : m));
      setMovieToEdit(undefined);
    } else {
      // Add new
      setMovies((prev) => [movieData, ...prev]);
    }
    
    // If we were editing a specific movie that was open, update selection too
    if (selectedMovie && selectedMovie.id === movieData.id) {
        setSelectedMovie(movieData);
        setView('details');
    } else {
        setView('library');
    }
  };

  // Handle updates from Detail View (e.g. Stickers)
  const handleUpdateMovie = (updatedMovie: Movie) => {
      if (isReadOnly) {
        showToast("只读模式已锁定：无法更改剧照或笔记。");
        return;
      }
      setMovies((prev) => prev.map(m => m.id === updatedMovie.id ? updatedMovie : m));
      setSelectedMovie(updatedMovie);
  };

  const handleDeleteMovie = (id: string) => {
    if (isReadOnly) {
      showToast("只读模式已锁定：无法删除电影记录。");
      return;
    }

    if (window.confirm('Are you sure you want to delete this record?')) {
      setMovies((prev) => prev.filter(m => m.id !== id));
      setSelectedMovie(null);
      setMovieToEdit(undefined);
      setView('library');
    }
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setView('details');
  };

  const handleEditMovie = (movie: Movie) => {
    setMovieToEdit(movie);
    setView('add'); // Re-use 'add' view for edit
  };

  const handleBackToList = () => {
    setSelectedMovie(null);
    setMovieToEdit(undefined);
    setView('library');
  };
  
  const handleCancelForm = () => {
      setMovieToEdit(undefined);
      if (selectedMovie) {
          setView('details');
      } else {
          setView('library');
      }
  };

  // Handle FAB Click from Layout
  const handleFabClick = () => {
      if (view === 'add') {
          if (isReadOnly) {
            showToast("只读模式已锁定：无法保存新记录。");
            return;
          }
          // If in Add/Edit mode, trigger Submit
          if (formRef.current) {
              formRef.current.submit();
          }
      } else {
          // Otherwise switch to Add mode
          setMovieToEdit(undefined);
          setView('add');
      }
  };

  const handleNavChange = (newView: ViewState) => {
      if (newView === 'add') {
          setMovieToEdit(undefined);
      }
      setView(newView);
  };

  // Data Import Handler
  const handleImportData = (importedMovies: Movie[]) => {
      if (isReadOnly) {
        showToast("只读模式已锁定：无法导入或覆盖数据。");
        return;
      }
      setMovies(importedMovies);
      showToast(`同步完成：已导入 ${importedMovies.length} 部电影记录。`);
      setView('library');
  };

  // Generate read-only share URL
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('mode', 'readonly');
    return url.toString();
  };

  const handleCopyShareLink = () => {
    const link = getShareUrl();
    navigator.clipboard.writeText(link).then(() => {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 3000);
    }).catch(() => {
      showToast("复制失败，请手动长按复制链接。");
    });
  };

  return (
    <Layout 
      currentView={view} 
      onChangeView={handleNavChange} 
      onFabClick={handleFabClick}
      onShareClick={() => setIsShareModalOpen(true)}
      isReadOnly={isReadOnly}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-[90%] bg-neutral-900/95 text-white border border-white/20 px-5 py-3 rounded-full shadow-2xl flex items-center justify-center gap-3 backdrop-blur-xl animate-fade-in pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-400 shrink-0"></div>
          <span className="text-xs font-mono tracking-wide text-center">{toastMessage}</span>
        </div>
      )}

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div 
            className="bg-[#0a0a0a] border border-white/15 max-w-md w-full p-8 rounded-sm shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors text-lg"
              title="Close"
            >
              &times;
            </button>

            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-500 mb-2">
              PUBLIC ACCESS CONTROL
            </div>
            <h3 className="text-2xl font-heading text-white tracking-wide mb-3">
              Share Movie Archive
            </h3>
            <p className="text-xs text-neutral-400 font-serif leading-relaxed mb-6">
              分享以下只读链接给他人。访客打开后可以完整浏览您的所有电影记录、海报及深度影评，但<strong className="text-white">无法添加、编辑或删除任何内容</strong>。
            </p>

            {/* Link Box */}
            <div className="bg-neutral-900 border border-neutral-800 p-3 mb-6 flex items-center justify-between gap-3 overflow-hidden rounded-sm">
              <span className="text-xs font-mono text-neutral-300 truncate">
                {getShareUrl()}
              </span>
              <button 
                onClick={handleCopyShareLink}
                className="shrink-0 px-4 py-2 bg-white text-black text-[10px] uppercase font-bold tracking-widest hover:bg-neutral-200 transition-colors"
              >
                {copiedShareLink ? "COPIED!" : "COPY"}
              </button>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              <span>Security Status</span>
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Read-Only Guard Active
              </span>
            </div>
          </div>
        </div>
      )}

      {view === 'library' && (
        <MovieList 
            movies={movies} 
            onSelectMovie={handleSelectMovie} 
        />
      )}
      
      {view === 'add' && (
        <MovieForm 
          ref={formRef}
          onSave={handleSaveMovie} 
          onCancel={handleCancelForm} 
          onDelete={handleDeleteMovie}
          initialData={movieToEdit}
        />
      )}

      {view === 'details' && selectedMovie && (
        <MovieCard 
          movie={selectedMovie} 
          onBack={handleBackToList} 
          onEdit={handleEditMovie}
          onDelete={handleDeleteMovie}
          onUpdate={handleUpdateMovie}
        />
      )}

      {view === 'profile' && (
          <Profile 
            movies={movies} 
            onDataImport={handleImportData}
          />
      )}
    </Layout>
  );
};

export default App;