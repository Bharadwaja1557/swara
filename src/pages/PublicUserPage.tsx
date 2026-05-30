/**
 * src/pages/PublicUserPage.tsx
 *
 * Public profile page (/user/:username).
 * Shows ONLY public playlists. No settings, no private/saved visibility.
 * Navigates to /user/:username from any CreatorLink that isn't the current user.
 */
import { useState, useEffect }     from 'react';
import { useParams, useNavigate }  from 'react-router-dom';
import { supabase }                from '@/lib/supabase';
import { buildAvatarUrl }         from '@/repositories/profile/ProfileRepository';
import UserAvatar                 from '@/components/profile/UserAvatar';
import { PlaylistArtwork }         from '@/features/artwork';
import type { Playlist }           from '@/store/usePlaylistStore';

interface PublicProfile {
  id:                string;
  username:          string;
  avatar_url:        string | null;
  avatar_updated_at: string | null;
  created_at:        string;
}

const PublicUserPage = () => {
  const { username }            = useParams<{ username: string }>();
  const navigate                = useNavigate();
  
  const [profile, setProfile]   = useState<PublicProfile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);

    (async () => {
      // Fetch profile by username
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, avatar_updated_at, created_at')
        .eq('username', username)
        .single();

      if (profileErr || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const prof = profileData as PublicProfile;
      setProfile(prof);

      // Fetch their public playlists + track IDs for artwork
      const { data: plData } = await supabase
        .from('playlists')
        .select('id, title, description, cover_url, cover_id, is_public, track_count, created_at, updated_at')
        .eq('user_id', prof.id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false });

      if (!plData || plData.length === 0) {
        setPlaylists([]);
        setLoading(false);
        return;
      }

      const playlistIds = (plData as { id: string }[]).map((r) => r.id);

      // Batch track IDs for artwork
      const { data: trackRows } = await supabase
        .from('playlist_tracks')
        .select('playlist_id, track_id')
        .in('playlist_id', playlistIds)
        .order('playlist_id', { ascending: true })
        .order('position', { ascending: true });

      const trackMap = new Map<string, string[]>();
      for (const tr of ((trackRows ?? []) as { playlist_id: string; track_id: string }[])) {
        const list = trackMap.get(tr.playlist_id) ?? [];
        list.push(tr.track_id);
        trackMap.set(tr.playlist_id, list);
      }

      const resolved: Playlist[] = (plData as {
        id: string; title: string; description: string | null;
        cover_url: string | null; cover_id: string | null;
        is_public: boolean; track_count: number; created_at: string; updated_at: string;
      }[]).map((r) => ({
        id:              r.id,
        title:           r.title,
        description:     r.description ?? undefined,
        coverImageUrl:   r.cover_url ?? undefined,
        coverId:         r.cover_id  ?? undefined,
        isPublic:        r.is_public,
        trackCount:      r.track_count,
        createdAt:       r.created_at,
        updatedAt:       r.updated_at,
        trackIds:        trackMap.get(r.id) ?? [],
        creatorUserId:   prof.id,
        creatorUsername: prof.username,
        isOwned:         false,
        isSaved:         false,
      }));

      setPlaylists(resolved);
      setLoading(false);
    })();
  }, [username]);

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  if (!loading && notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-[1rem] font-semibold text-swara-muted">User not found</p>
        <button type="button" onClick={() => navigate(-1)} className="text-swara-accent text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 lg:px-8 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-[1rem] font-semibold text-swara-text tracking-tight truncate">
          {profile?.username ?? username}
        </h1>
      </div>

      <div className="flex flex-col items-center pt-8 px-6 lg:px-10 gap-5 pb-10">
        {/* Avatar */}
        {loading
          ? <div className="w-20 h-20 rounded-full bg-swara-elevated border border-swara-border flex items-center justify-center flex-shrink-0"><div className="w-7 h-7 rounded-full border-2 border-swara-border border-t-swara-accent animate-spin" /></div>
          : <UserAvatar
              username={profile?.username ?? username ?? '?'}
              avatarUrl={profile ? buildAvatarUrl(profile.avatar_url, profile.avatar_updated_at) : null}
              size={80}
              className="border border-swara-border"
            />
        }

        {/* Identity */}
        {!loading && profile && (
          <div className="text-center">
            <h2 className="text-[1.2rem] font-bold text-swara-text font-display tracking-tight">{profile.username}</h2>
            {joinedDate && <p className="text-[0.72rem] text-swara-dim mt-1">Joined {joinedDate}</p>}
            <p className="text-[0.78rem] text-swara-muted mt-0.5">{playlists.length} public playlist{playlists.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Public playlists */}
        {!loading && playlists.length > 0 && (
          <div className="w-full">
            <p className="text-[0.68rem] font-semibold text-swara-muted tracking-widest uppercase mb-3 px-1">Playlists</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {playlists.map((pl) => (
                <button key={pl.id} type="button"
                  onClick={() => navigate(`/playlist/${pl.id}/${slugify(pl.title)}`)}
                  className="flex flex-col text-left active:scale-[0.97] group">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-swara-elevated mb-2">
                    <PlaylistArtwork playlist={pl} size={0} className="w-full h-full" />
                  </div>
                  <p className="text-[0.8rem] font-semibold text-swara-text truncate leading-tight">{pl.title}</p>
                  <p className="text-[0.7rem] text-swara-muted mt-0.5">{pl.trackCount} track{pl.trackCount !== 1 ? 's' : ''}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && playlists.length === 0 && profile && (
          <p className="text-swara-muted text-sm text-center py-8">No public playlists yet</p>
        )}
      </div>
    </div>
  );
};

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default PublicUserPage;
