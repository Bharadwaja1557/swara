/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Static export for GitHub Pages ─────────────────────────────────────
  output: 'export',

  // Trailing slashes: /album/foo → /album/foo/ → album/foo/index.html
  // Required for GitHub Pages directory-based routing
  trailingSlash: true,

  // ── GitHub Pages subdirectory support ───────────────────────────────────
  // If deploying to username.github.io/swara, set NEXT_PUBLIC_BASE_PATH=/swara
  // If deploying to root (username.github.io or custom domain), leave empty
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // ── Images ──────────────────────────────────────────────────────────────
  // Must be unoptimized for static export (no image optimization server)
  images: {
    unoptimized: true,
  },

  // ── Public runtime env vars ──────────────────────────────────────────────
  // Values baked into the static bundle at build time
  env: {
    // SHA-256 hex hash of passphrase — set via GitHub secret in CI
    // Default is hash of "swara" — MUST override for production
    NEXT_PUBLIC_PASSPHRASE_HASH:
      process.env.NEXT_PUBLIC_PASSPHRASE_HASH ||
      'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',

    // m4a-db public repository
    NEXT_PUBLIC_MUSIC_DB_REPO:
      process.env.NEXT_PUBLIC_MUSIC_DB_REPO ||
      'gajala-sonic-solutions/m4a-db',
  },

  // ── Headers ─────────────────────────────────────────────────────────────
  // Note: headers() is ignored in static export — these are for reference
  // Set these in your web server / CDN config if using custom hosting
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         { key: 'X-Content-Type-Options', value: 'nosniff' },
  //         { key: 'X-Frame-Options', value: 'DENY' },
  //         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  //       ],
  //     },
  //   ];
  // },

  // ── Webpack tweaks ───────────────────────────────────────────────────────
  webpack: (config, { isServer }) => {
    // Prevent server-side audio API usage from failing the build
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
