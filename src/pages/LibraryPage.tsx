import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';

const TABS = ['All', 'Albums', 'Artists'] as const;
type LibraryTab = (typeof TABS)[number];

const LibraryPage = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('All');
  const navigate = useNavigate();
  const { albums, artists, loading, error } = useLibraryStore();

  const showAlbums = activeTab === 'All' || activeTab === 'Albums';
  const showArtists = activeTab === 'All' || activeTab === 'Artists';

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-5 pt-5">
        <h1 className="text-xl font-bold text-swara-text tracking-tight font-display">
          My Library
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-shrink-0 px-4 py-1.5 rounded-full',
                'text-[0.8125rem] font-medium',
                'border transition-all duration-200',
                activeTab === tab
                  ? 'bg-swara-accent border-swara-accent text-swara-bg'
                  : 'bg-transparent border-swara-border text-swara-muted hover:text-swara-text hover:border-swara-elevated',
              ].join(' ')}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 mt-4 h-px bg-swara-border opacity-60" aria-hidden="true" />

      {/* Error */}
      {error && (
        <div className="mx-5 mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="px-5 py-4 space-y-6">
          {/* Albums section */}
          {showAlbums && albums.length > 0 && (
            <section>
              {activeTab === 'All' && (
                <h2 className="text-[0.8125rem] font-semibold text-swara-muted uppercase tracking-widest mb-3">
                  Albums
                </h2>
              )}
              <div className="space-y-1">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => navigate(`/album/${album.id}`)}
                    className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
                  >
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-swara-elevated"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
                        {album.title}
                      </p>
                      <p className="text-[0.6875rem] text-swara-muted truncate">
                        {album.composer} · {album.year}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Artists section */}
          {showArtists && artists.length > 0 && (
            <section>
              {activeTab === 'All' && (
                <h2 className="text-[0.8125rem] font-semibold text-swara-muted uppercase tracking-widest mb-3 mt-2">
                  Artists
                </h2>
              )}
              <div className="space-y-1">
                {artists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-swara-card active:scale-[0.98] transition-all duration-150 text-left"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-swara-elevated">
                      <img
                        src={artist.coverUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] font-medium text-swara-text leading-snug truncate tracking-tight">
                        {artist.name}
                      </p>
                      <p className="text-[0.6875rem] text-swara-muted truncate">
                        {artist.albumIds.length} {artist.albumIds.length === 1 ? 'album' : 'albums'}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-swara-dim flex-shrink-0" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {albums.length === 0 && artists.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-16 gap-3">
              <p className="text-sm text-swara-muted text-center">No items in your library yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
