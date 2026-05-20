/**
 * RecentlyPlayed — shows recently played songs (deduped by album).
 * Exactly 3 fully visible cards on screen.
 */
import { useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/store/playerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { trackActions } from '@/lib/trackActions';
import type { Track } from '@/types/music';

const PH = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2320202A"/><text x="50" y="60" font-size="36" text-anchor="middle" fill="%233E3D3A">♪</text></svg>';

interface RecentCardProps { track: Track; albumId: string; }

const RecentCard = ({ track, albumId }: RecentCardProps) => {
  const navigate  = useNavigate();
  const { albums, loadAlbumTracks } = useLibraryStore();

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    let albumTracks = album.tracks;
    if (!albumTracks.length) albumTracks = await loadAlbumTracks(albumId);
    if (albumTracks.length) trackActions.playFromAlbum(track, { ...album, tracks: albumTracks });
  };

  return (
    /* Card width via class so lg: breakpoint can properly override.
       Inline style was fighting max-width on desktop (inline > class specificity),
       keeping cards at 100vw-based width and causing subtle overflow → ugly scrollbar. */
    <button
      type="button"
      onClick={() => navigate(`/album/${albumId}`)}
      className="flex-shrink-0 flex flex-col text-left active:scale-[0.95] transition-transform duration-150 group [width:calc((100vw_-_52px)/3)] lg:w-[148px]"
      aria-label={`Open ${track.album}`}
    >
      <div className="relative w-full rounded-xl overflow-hidden bg-swara-elevated"
        style={{ aspectRatio: '1/1' }}>
        <img
          src={track.coverUrl || PH}
          alt={track.album}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PH; }}
        />
        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors duration-200"
          onClick={handlePlay}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-8 h-8 rounded-full bg-swara-accent flex items-center justify-center">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="#0a0a0a" aria-hidden="true">
              <path d="M5 3.5l8 4.5-8 4.5V3.5Z"/>
            </svg>
          </div>
        </div>
      </div>
      <p className="text-[0.75rem] font-medium text-swara-text mt-2 truncate w-full">{track.title}</p>
      <p className="text-[0.68rem] text-swara-muted truncate w-full">{track.artist}</p>
    </button>
  );
};

const RecentlyPlayed = () => {
  const { tracks } = useLibraryStore();
  const recentSongs = usePlayerStore((s) => s.recentSongs);

  // ── Scroll-to-left fix ───────────────────────────────────────────────────────
  // Root cause: browsers (Chrome, Safari) persist scrollLeft of overflow
  // containers as part of native scroll restoration. This fires AFTER paint,
  // so a plain useEffect(scrollLeft=0) loses the race.
  //
  // Fix: useLayoutEffect fires synchronously after DOM mutations, before paint.
  // A nested requestAnimationFrame then catches any second-pass layout the
  // browser performs once images begin loading (which can nudge scrollLeft again).
  // The double-rAF is the minimal reliable guard against both timing windows.
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Immediate reset (catches most cases)
    el.scrollLeft = 0;
    // rAF: catches post-layout scroll restoration triggered by image dimension calc
    const raf1 = requestAnimationFrame(() => {
      el.scrollLeft = 0;
      // Second frame: catches any deferred browser scroll-restoration pass
      const raf2 = requestAnimationFrame(() => { el.scrollLeft = 0; });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []); // run once on mount — recentSongs is seeded synchronously from localStorage

  // Resolve entries → track objects, deduped by albumId (keep most recent)
  const seen = new Set<string>();
  const recentTracks: Array<{ track: Track; albumId: string }> = [];

  for (const entry of recentSongs) {
    if (seen.has(entry.albumId)) continue;
    seen.add(entry.albumId);
    const track = tracks.find((t) => t.id === entry.trackId);
    if (track) recentTracks.push({ track, albumId: entry.albumId });
    if (recentTracks.length >= 10) break;
  }

  if (!recentTracks.length) return null;

  return (
    <section className="pt-5 pb-2" aria-labelledby="recents-heading">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 id="recents-heading"
          className="text-[0.8125rem] font-semibold text-swara-muted tracking-widest uppercase">
          Recently Played
        </h2>
      </div>

      {/* Spacer-based padding: more reliable than px-5 on overflow-x-auto containers.
          On some browsers/platforms, padding-left of a scroll container is collapsed
          or scrolled over. A real flex child can't be skipped. */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-none pb-1"
        style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: '20px', WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {/* Leading spacer — guarantees left breathing room regardless of browser */}
        <div className="flex-shrink-0 w-5" aria-hidden="true" />
        {recentTracks.map(({ track, albumId }) => (
          <div key={albumId} role="listitem" style={{ scrollSnapAlign: 'start' }}>
            <RecentCard track={track} albumId={albumId} />
          </div>
        ))}
        {/* Trailing spacer — mirrors leading gap at scroll end */}
        <div className="flex-shrink-0 w-5" aria-hidden="true" />
      </div>
    </section>
  );
};

export default RecentlyPlayed;
