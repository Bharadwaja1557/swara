import { HashRouter, Routes, Route } from 'react-router-dom';
import AppLayout      from '@/layouts/AppLayout';
import HomePage       from '@/pages/HomePage';
import SearchPage     from '@/pages/SearchPage';
import LibraryPage    from '@/pages/LibraryPage';
import AlbumPage      from '@/pages/AlbumPage';
import ArtistPage     from '@/pages/ArtistPage';
import ProfilePage    from '@/pages/ProfilePage';
import LikedSongsPage from '@/pages/LikedSongsPage';
import QueuePage      from '@/pages/QueuePage';
import PlaylistPage   from '@/pages/PlaylistPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/"              element={<HomePage />} />
          <Route path="/search"        element={<SearchPage />} />
          <Route path="/library"       element={<LibraryPage />} />
          <Route path="/liked"         element={<LikedSongsPage />} />
          <Route path="/album/:id"     element={<AlbumPage />} />
          <Route path="/artist/:id"    element={<ArtistPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/queue"         element={<QueuePage />} />
          <Route path="/playlist/:id"  element={<PlaylistPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
