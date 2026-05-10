'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import type { AlbumDetail } from '@/types';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { TrackRow } from '@/components/library/TrackRow';
import { Spinner } from '@/components/ui/EmptyState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AlbumPageClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const router = useRouter();

  const albums          = useLibraryStore((s) => s.albums);
  const albumDetails    = useLibraryStore((s) => s.albumDetails);
  const isLoadingDetail = useLibraryStore((s) => s.isLoadingDetail);
  const fetchAlbumDetail = useLibraryStore((s) => s.fetchAlbumDetail);
  const fetchAlbums     = useLibraryStore((s) => s.fetchAlbums);

  const playAlbum    = usePlayerStore((s) => s.playAlbum);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Ensure library bootstrapped (handles direct URL navigation)
  useEffect(() => {
    if (albums.length === 0) fetchAlbums().catch(() => {});
  }, [albums.length, fetchAlbums]);

  // Fetch album detail once we have an ID and albums are loaded
  useEffect(() => {
    if (!id || fetchedRef.current) return;
    if (albumDetails[id]) { fetchedRef.current = true; return; }
    if (albums.length === 0) return; // wait for library

    fetchedRef.current = true;
    fetchAlbumDetail(id).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load album');
    });
  }, [id, albumDetails, albums, fetchAlbumDetail]);

  // Reset fetch flag when ID changes (user navigates between albums)
  useEffect(() => {
    fetchedRef.current = false;
    setError(null);
  }, [id]);

  // ─── States ──────────────────────────────────────────────────────────────

  if (!id) {
    return (
      <EmptyState
        title="No album selected"
        description="Go back to the library and choose an album."
        action={
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold"
          >
            Back to library
          </button>
        }
      />
    );
  }

  const detail: AlbumDetail | undefined = albumDetails[id];
  const isLoading = isLoadingDetail[id] ?? false;

  if (isLoading || (!detail && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="px-4 pt-20">
        <EmptyState
          title="Album not found"
          description={error || `Could not find album "${id}"`}
          action={
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-bg-surface border border-border text-text rounded-xl text-sm font-semibold"
            >
              Back to library
            </button>
          }
        />
      </div>
    );
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  function handlePlayAll() {
    playAlbum(detail!.tracks, 0);
  }

  function handleShufflePlay() {
    const idx = Math.floor(Math.random() * detail!.tracks.length);
    playAlbum(detail!.tracks, idx);
    requestAnimationFrame(() => toggleShuffle());
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Blurred cover background */}
        {detail.coverUrl && (
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
            <Image
              src={detail.coverUrl}
              alt=""
              fill
              className="object-cover opacity-[0.12] blur-[64px] scale-125"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bg/50 via-bg/80 to-bg" />
          </div>
        )}

        {/* Back */}
        <div className="relative z-10 px-4">
          <button
            onClick={() => router.back()}
            className="mt-4 w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface/70 border border-border/60 backdrop-blur-sm active:scale-90 transition-transform"
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Cover + meta */}
        <div className="relative z-10 flex flex-col items-center px-6 pb-8 pt-4 text-center">
          <div className="w-48 h-48 rounded-3xl overflow-hidden mb-6 ring-1 ring-white/8 shadow-[0_20px_64px_rgba(0,0,0,0.65)] flex-shrink-0">
            {detail.coverUrl ? (
              <Image
                src={detail.coverUrl}
                alt={detail.title}
                width={192}
                height={192}
                className="w-full h-full object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                <DefaultCoverIcon />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-text tracking-tight leading-snug max-w-xs">
            {detail.title}
          </h1>
          {detail.primaryArtist && (
            <p className="text-base text-text-secondary mt-1.5">{detail.primaryArtist}</p>
          )}

          <div className="flex items-center flex-wrap justify-center gap-2 mt-3">
            {detail.genre && (
              <span className="text-xs text-text-muted bg-bg-elevated px-2.5 py-1 rounded-full border border-border capitalize">
                {detail.genre}
              </span>
            )}
            {detail.year && <span className="text-xs text-text-muted">{detail.year}</span>}
            {detail.trackCount > 0 && (
              <>
                <span className="text-border text-xs">·</span>
                <span className="text-xs text-text-muted">{detail.trackCount} tracks</span>
              </>
            )}
          </div>

          {detail.description && (
            <p className="text-sm text-text-muted mt-4 max-w-sm leading-relaxed">
              {detail.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 flex items-center gap-3">
        <button
          onClick={handlePlayAll}
          className="flex-1 h-12 rounded-2xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-accent-glow active:scale-[0.97] transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z" /></svg>
          Play all
        </button>
        <button
          onClick={handleShufflePlay}
          className="h-12 px-5 rounded-2xl bg-bg-surface border border-border text-text font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M16 3h5v5M4 20l16-16M16 20h5v-5M4 4l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Shuffle
        </button>
      </div>

      <div className="mx-5 border-t border-border mb-1" />

      {/* ── Track list ──────────────────────────────────────────────────── */}
      <div className="pb-4 pt-2">
        {detail.tracks.length === 0 ? (
          <EmptyState title="No tracks in this album" />
        ) : (
          <div className="space-y-0.5">
            {detail.tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={detail.tracks}
                index={i}
                showAlbum={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultCoverIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="#2a2a2a" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8" stroke="#2a2a2a" strokeWidth="1.5" />
    </svg>
  );
}
