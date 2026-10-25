import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Movie } from '../types';
import { storage } from '../services/storage';

interface ProfileProps {
  movies: Movie[];
  onDataImport: (movies: Movie[]) => void;
}

// Helper to resize images
const resizeImage = (file: File, maxWidth = 500): Promise<string> => {
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
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

const Profile: React.FC<ProfileProps> = ({ movies, onDataImport }) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [directorName, setDirectorName] = useState<string>('NAME');
  const [isEditingName, setIsEditingName] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const loadProfile = async () => {
          // Avatar from DB
          const savedAvatar = await storage.getAvatar();
          if (savedAvatar) setAvatar(savedAvatar);
          else {
              // Check legacy local storage for avatar migration
              const legacyAvatar = localStorage.getItem('cineLogAvatar');
              if (legacyAvatar) {
                  setAvatar(legacyAvatar);
                  await storage.saveAvatar(legacyAvatar);
                  localStorage.removeItem('cineLogAvatar');
              }
          }

          // Name from LocalStorage (Simple string is fine in LS)
          const savedName = localStorage.getItem('cineLogDirectorName');
          if (savedName) setDirectorName(savedName);
      };
      loadProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const resized = await resizeImage(file, 500);
              setPendingAvatar(resized);
          } catch (error) {
              console.error("Avatar resize failed", error);
          }
      }
  };

  const confirmAvatar = async () => {
      if (!pendingAvatar) return;
      try {
          await storage.saveAvatar(pendingAvatar);
          setAvatar(pendingAvatar);
          setPendingAvatar(null);
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
          console.error("Storage failed", error);
          alert("Failed to save image. Database error.");
      }
  };

  const cancelAvatar = () => {
      setPendingAvatar(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const handleNameSave = () => {
      setIsEditingName(false);
      const finalName = directorName.trim() || 'NAME';
      setDirectorName(finalName);
      localStorage.setItem('cineLogDirectorName', finalName);
  };

  // EXPORT DATA
  const handleExport = async () => {
      const savedAvatar = await storage.getAvatar();
      const data = {
          movies: movies,
          avatar: savedAvatar,
          directorName: localStorage.getItem('cineLogDirectorName')
      };
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CineLog_Archive_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // IMPORT DATA
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (data.movies && Array.isArray(data.movies)) {
                  // Restore Movies
                  onDataImport(data.movies);
                  
                  // Restore Profile
                  if (data.avatar) {
                      await storage.saveAvatar(data.avatar);
                      setAvatar(data.avatar);
                  }
                  if (data.directorName) {
                      localStorage.setItem('cineLogDirectorName', data.directorName);
                      setDirectorName(data.directorName);
                  }
              } else {
                  alert("Invalid archive file format.");
              }
          } catch (err) {
              console.error(err);
              alert("Failed to parse archive file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  const stats = useMemo(() => {
    const totalMovies = movies.length;
    
    // Calculate Avg Rating
    const totalRating = movies.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = totalMovies > 0 ? (totalRating / totalMovies).toFixed(1) : '0.0';

    // Est Watch Time (assuming 2h per movie on average)
    const totalMinutes = totalMovies * 110; 
    const hours = Math.floor(totalMinutes / 60);

    // Top Genres
    const genreCounts: Record<string, number> = {};
    movies.forEach(m => {
        m.genres?.forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
    });
    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);

    return { totalMovies, avgRating, hours, topGenres };
  }, [movies]);

  return (
    <div className="animate-fade-in text-center pt-8 pb-32 px-8">
        {/* ID Card Header */}
        <div className="max-w-md mx-auto border border-white/10 bg-neutral-900/50 p-8 mb-12 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neutral-800 via-white to-neutral-800"></div>
            
            <div 
                className="relative w-32 h-32 mx-auto mb-6 rounded-sm overflow-hidden border border-neutral-700 transition-colors"
                title={pendingAvatar ? "Confirm change" : "Click to change ID photo"}
            >
                 {pendingAvatar ? (
                     // Preview Mode
                     <div className="relative w-full h-full">
                         <img src={pendingAvatar} alt="Preview" className="w-full h-full object-cover opacity-50" />
                         <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-sm">
                             <button 
                                onClick={confirmAvatar}
                                className="bg-white text-black text-[9px] font-bold uppercase px-4 py-1.5 rounded-sm hover:bg-green-400 transition-colors tracking-widest"
                             >
                                 Confirm
                             </button>
                             <button 
                                onClick={cancelAvatar}
                                className="bg-black/50 text-white text-[9px] font-bold uppercase px-4 py-1.5 rounded-sm border border-white/20 hover:bg-red-500 hover:border-red-500 transition-colors tracking-widest"
                             >
                                 Cancel
                             </button>
                         </div>
                     </div>
                 ) : (
                     // Normal Mode
                     <div 
                        className="w-full h-full cursor-pointer relative group-hover:border-white transition-all duration-300"
                        onClick={() => fileInputRef.current?.click()}
                     >
                         {avatar ? (
                             <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" />
                         ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                <span className="font-heading text-4xl text-neutral-600 group-hover:text-white transition-colors">ID</span>
                            </div>
                         )}
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                             <span className="text-[9px] font-bold uppercase tracking-widest text-white border-b border-white pb-1">Change Photo</span>
                         </div>
                     </div>
                 )}
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                accept="image/*" 
                className="hidden" 
            />

            <div className="relative">
                {isEditingName ? (
                    <input
                        type="text"
                        value={directorName}
                        onChange={(e) => setDirectorName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                        autoFocus
                        className="bg-transparent border-b border-white/30 text-3xl font-heading text-white mb-2 tracking-wider text-center outline-none w-full uppercase"
                    />
                ) : (
                    <h2 
                        onClick={() => setIsEditingName(true)}
                        className="text-3xl font-heading text-white mb-2 tracking-wider cursor-pointer hover:text-neutral-300 transition-colors uppercase"
                        title="Click to edit name"
                    >
                        {directorName}
                    </h2>
                )}
            </div>
            
            <div className="w-12 h-px bg-white/20 mx-auto mb-4"></div>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.3em]">Personal Information Card</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-cinema-900 p-6 border border-white/5 hover:border-white/20 transition-colors text-left relative group">
                <div className="absolute top-2 right-2 text-[8px] text-neutral-700 group-hover:text-white transition-colors font-mono">01</div>
                <div className="text-4xl font-heading text-white mb-2">{stats.totalMovies}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Total Logs</div>
            </div>
            <div className="bg-cinema-900 p-6 border border-white/5 hover:border-white/20 transition-colors text-left relative group">
                <div className="absolute top-2 right-2 text-[8px] text-neutral-700 group-hover:text-white transition-colors font-mono">02</div>
                <div className="text-4xl font-heading text-white mb-2">{stats.avgRating}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Avg Score</div>
            </div>
            <div className="bg-cinema-900 p-6 border border-white/5 col-span-2 hover:border-white/20 transition-colors text-left relative group">
                <div className="absolute top-2 right-2 text-[8px] text-neutral-700 group-hover:text-white transition-colors font-mono">03</div>
                <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-heading text-white mb-2">{stats.hours}</div>
                    <span className="text-sm text-neutral-500 font-serif italic">hours</span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">Total Runtime</div>
            </div>
        </div>

        <div className="mt-12 text-left max-w-2xl mx-auto">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-6 border-b border-white/10 pb-2 flex justify-between">
                <span>Top Genres</span>
                <span>Analysis</span>
            </h3>
            <div className="space-y-4">
                {stats.topGenres.length > 0 ? stats.topGenres.map((genre, idx) => (
                    <div key={genre} className="flex items-center justify-between group cursor-default">
                        <span className="text-xl font-heading text-white group-hover:text-neutral-300 transition-colors">
                            <span className="text-neutral-700 text-sm mr-4 font-mono">0{idx + 1}</span>
                            {genre}
                        </span>
                        <span className="h-px flex-1 bg-neutral-900 mx-4 group-hover:bg-neutral-700 transition-colors"></span>
                    </div>
                )) : (
                     <div className="text-neutral-600 italic font-serif text-sm">No data recorded.</div>
                )}
            </div>
        </div>

        {/* DATA SYNC SECTION */}
        <div className="mt-20 max-w-2xl mx-auto text-left border-t border-white/5 pt-12">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-6 flex justify-between">
                <span>Data Synchronization</span>
                <span>Archive Control</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                    onClick={handleExport}
                    className="group py-6 border border-white/10 hover:bg-white hover:text-black transition-colors flex flex-col items-center justify-center gap-3"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span className="text-[10px] uppercase font-bold tracking-widest">Download Archive</span>
                </button>
                
                <button 
                    onClick={() => importInputRef.current?.click()}
                    className="group py-6 border border-white/10 hover:bg-white hover:text-black transition-colors flex flex-col items-center justify-center gap-3"
                >
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span className="text-[10px] uppercase font-bold tracking-widest">Restore Backup</span>
                </button>
                <input 
                    type="file" 
                    ref={importInputRef} 
                    onChange={handleImport} 
                    accept=".json" 
                    className="hidden" 
                />
            </div>
            <p className="mt-4 text-[9px] text-neutral-600 font-serif italic text-center">
                Use Download/Restore to sync your database across devices manually.
            </p>
        </div>

        <div className="mt-20 pt-8 border-t border-white/5 opacity-50">
            <p className="font-heading text-neutral-500 text-xs tracking-[0.5em] text-center">
                CINELOG ARCHIVE SYSTEM
            </p>
        </div>
    </div>
  );
};

export default Profile;