/**
 * /album/ — static page, always pre-built, no dynamic route.
 *
 * URL format:  /album/?id=<release-tag>
 *
 * Why search params instead of /album/[id]/:
 * - generateStaticParams cannot work when album IDs are unknown at build time
 *   (they come from GitHub Releases, not baked into the repo)
 * - A single static /album/index.html handles ALL album IDs via search params
 * - Works perfectly with GitHub Pages + the SPA 404 fallback
 *
 * useSearchParams() MUST be in a client component wrapped by <Suspense>.
 */

import { Suspense } from 'react';
import AlbumPageClient from './AlbumPageClient';
import AlbumLoading from './loading';

export default function AlbumPage() {
  return (
    <Suspense fallback={<AlbumLoading />}>
      <AlbumPageClient />
    </Suspense>
  );
}
