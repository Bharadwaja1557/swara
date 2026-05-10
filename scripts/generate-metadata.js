#!/usr/bin/env node
/**
 * generate-metadata.js
 *
 * Local version of the m4a-db GitHub Action.
 * Given a directory of .m4a files + optional cover.webp, outputs:
 *   - albums.json (index of all albums)
 *   - data/<release-tag>.json (per-album metadata)
 *
 * Usage:
 *   node scripts/generate-metadata.js \
 *     --release-tag "bollywood-2024" \
 *     --release-title "Bollywood Hits 2024" \
 *     --files-dir ./sample-files \
 *     --repo gajala-sonic-solutions/m4a-db \
 *     --output ./data
 *
 * In CI, this logic runs as a GitHub Action in the m4a-db repo.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Filename parser (mirrors src/lib/parseFilename.ts) ──────────────────

/**
 * Decode a filename segment: replace underscores with spaces.
 * Preserves: dots, hyphens, alphanumerics, everything except underscore.
 */
function decodeSegment(segment) {
  return segment.replace(/_/g, ' ').trim();
}

/**
 * Parse an array of artist strings from the SINGERS segment.
 * "+" is the multi-artist separator.
 * Each artist name has underscores decoded.
 *
 * Examples:
 *   "Arijit_Singh"                → ["Arijit Singh"]
 *   "A.R_Rahman+Sid_Sriram"       → ["A.R Rahman", "Sid Sriram"]
 *   "Pritam+Arijit_Singh"         → ["Pritam", "Arijit Singh"]
 */
function parseArtists(singersSegment) {
  if (!singersSegment) return ['Unknown Artist'];
  return singersSegment
    .split('+')
    .map(a => decodeSegment(a))
    .filter(Boolean);
}

/**
 * Format artists array to display string.
 */
function formatArtistsDisplay(artists) {
  if (artists.length === 0) return 'Unknown Artist';
  if (artists.length === 1) return artists[0];
  if (artists.length === 2) return `${artists[0]} & ${artists[1]}`;
  return artists.slice(0, -1).join(', ') + ' & ' + artists[artists.length - 1];
}

/**
 * Parse a filename (with or without .m4a) into structured metadata.
 *
 * Format: TRACK--SINGERS--TITLE.m4a
 * Example: 01--A.R_Rahman+Sid_Sriram--The_Life_of_Ram.m4a
 * Result:
 *   trackNumber: 1
 *   artists: ["A.R Rahman", "Sid Sriram"]
 *   artistsDisplay: "A.R Rahman & Sid Sriram"
 *   title: "The Life of Ram"
 */
function parseFilename(filename) {
  const base = filename.replace(/\.m4a$/i, '');
  const parts = base.split('--');

  if (parts.length < 3) {
    console.warn(`  [warn] Cannot parse filename: "${filename}" — expected TRACK--SINGERS--TITLE.m4a`);
    return {
      trackNumber: 0,
      artists: ['Unknown Artist'],
      artistsDisplay: 'Unknown Artist',
      title: decodeSegment(base) || filename,
    };
  }

  const trackNumber = parseInt(parts[0], 10) || 0;
  const artists = parseArtists(parts[1]);
  const artistsDisplay = formatArtistsDisplay(artists);
  const titleRaw = parts.slice(2).join('--'); // handle "--" in title (edge case)
  const title = decodeSegment(titleRaw) || 'Unknown Title';

  return { trackNumber, artists, artistsDisplay, title };
}

// ─── CLI Args ─────────────────────────────────────────────────────────────

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

function requireArg(name) {
  const v = getArg(name);
  if (!v) { console.error(`[generate-metadata] Missing required argument: --${name}`); process.exit(1); }
  return v;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const releaseTag   = requireArg('release-tag');
  const releaseTitle = getArg('release-title') || releaseTag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const filesDir     = requireArg('files-dir');
  const repo         = requireArg('repo');
  const outputDir    = getArg('output') || './data';
  const year         = getArg('year') || new Date().getFullYear().toString();
  const genre        = getArg('genre') || '';

  console.log(`\n[generate-metadata] Processing release: ${releaseTag}`);
  console.log(`  Title:  ${releaseTitle}`);
  console.log(`  Repo:   ${repo}`);
  console.log(`  Source: ${filesDir}`);
  console.log(`  Output: ${outputDir}`);

  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });

  // ── Scan files ──────────────────────────────────────────────────────────

  if (!fs.existsSync(filesDir)) {
    console.error(`[generate-metadata] ERROR: files-dir not found: ${filesDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(filesDir).sort();
  const m4aFiles = allFiles.filter(f => f.toLowerCase().endsWith('.m4a'));
  const hasCover = allFiles.includes('cover.webp');

  if (m4aFiles.length === 0) {
    console.warn('[generate-metadata] WARNING: No .m4a files found in files-dir');
  }

  console.log(`\n  Found ${m4aFiles.length} track(s)${hasCover ? ' + cover.webp' : ''}`);

  // ── Build URLs ──────────────────────────────────────────────────────────

  const releaseBaseUrl = `https://github.com/${repo}/releases/download/${releaseTag}`;
  const coverUrl = hasCover ? `${releaseBaseUrl}/cover.webp` : '';

  // jsDelivr CDN URL for per-album JSON (served from repo data/)
  const cdnBase = `https://cdn.jsdelivr.net/gh/${repo}@main`;
  const metaUrl = `${cdnBase}/data/${releaseTag}.json`;

  // ── Parse tracks ────────────────────────────────────────────────────────

  const tracks = m4aFiles
    .map(filename => {
      const parsed = parseFilename(filename);
      const streamUrl = `${releaseBaseUrl}/${encodeURIComponent(filename)}`;
      return {
        trackNumber: parsed.trackNumber,
        filename: filename.replace(/\.m4a$/i, ''),
        title: parsed.title,
        artists: parsed.artists,
        artistsDisplay: parsed.artistsDisplay,
        streamUrl,
      };
    })
    // Sort by track number, then filename alphabetically
    .sort((a, b) => {
      if (a.trackNumber !== b.trackNumber) return a.trackNumber - b.trackNumber;
      return a.filename.localeCompare(b.filename);
    });

  // Derive primary artist from first track's first artist
  const primaryArtist = tracks.length > 0 ? tracks[0].artists[0] : '';

  // ── Build per-album JSON ─────────────────────────────────────────────────

  const albumMeta = {
    id: releaseTag,
    title: releaseTitle,
    coverUrl,
    year,
    primaryArtist,
    genre,
    description: '',
    tracks,
  };

  const albumMetaPath = path.join(outputDir, `${releaseTag}.json`);
  fs.writeFileSync(albumMetaPath, JSON.stringify(albumMeta, null, 2));
  console.log(`\n  ✓ Written: ${albumMetaPath}`);

  // ── Update albums.json ──────────────────────────────────────────────────

  const albumsJsonPath = path.join(outputDir, 'albums.json');
  let existing = { generated: '', repo, albums: [] };

  if (fs.existsSync(albumsJsonPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(albumsJsonPath, 'utf8'));
    } catch {
      console.warn('  [warn] Could not parse existing albums.json — starting fresh');
    }
  }

  // Remove existing entry for this release tag (for idempotent updates)
  existing.albums = (existing.albums || []).filter(a => a.id !== releaseTag);

  const albumEntry = {
    id: releaseTag,
    title: releaseTitle,
    coverUrl,
    year,
    trackCount: tracks.length,
    metaUrl,
    primaryArtist,
    genre,
  };

  existing.albums.push(albumEntry);

  // Sort albums: newest first (by year desc, then title asc)
  existing.albums.sort((a, b) => {
    const yearDiff = (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
    if (yearDiff !== 0) return yearDiff;
    return a.title.localeCompare(b.title);
  });

  existing.generated = new Date().toISOString();
  existing.repo = repo;

  fs.writeFileSync(albumsJsonPath, JSON.stringify(existing, null, 2));
  console.log(`  ✓ Updated: ${albumsJsonPath} (${existing.albums.length} album(s) total)`);

  // ── Print summary ────────────────────────────────────────────────────────

  console.log('\n  Tracks parsed:');
  tracks.forEach(t => {
    console.log(`    [${String(t.trackNumber).padStart(2, '0')}] ${t.title} — ${t.artistsDisplay}`);
  });
  console.log('\n[generate-metadata] Done.\n');
}

// ─── Self-test mode ───────────────────────────────────────────────────────

if (process.argv.includes('--self-test')) {
  console.log('[generate-metadata] Running self-test for filename parser...\n');

  const cases = [
    ['01--Arijit_Singh--Tum_Hi_Ho.m4a',                         { trackNumber: 1,  artists: ['Arijit Singh'],              title: 'Tum Hi Ho' }],
    ['01--A.R_Rahman+Sid_Sriram--The_Life_of_Ram.m4a',          { trackNumber: 1,  artists: ['A.R Rahman', 'Sid Sriram'],  title: 'The Life of Ram' }],
    ['12--Shreya_Ghoshal+Udit_Narayan--Dil-E-Nadaan.m4a',       { trackNumber: 12, artists: ['Shreya Ghoshal', 'Udit Narayan'], title: 'Dil-E-Nadaan' }],
    ['03--Arijit_Singh+Shreya_Ghoshal--Tum_Hi_Ho.m4a',          { trackNumber: 3,  artists: ['Arijit Singh', 'Shreya Ghoshal'], title: 'Tum Hi Ho' }],
    ['99--K.K--Pal_Pal_Dil_Ke_Paas.m4a',                        { trackNumber: 99, artists: ['K.K'],                       title: 'Pal Pal Dil Ke Paas' }],
    ['05--Shankar-Ehsaan-Loy--Dil_Chahta_Hai.m4a',              { trackNumber: 5,  artists: ['Shankar-Ehsaan-Loy'],        title: 'Dil Chahta Hai' }],
  ];

  let passed = 0;
  cases.forEach(([filename, expected]) => {
    const result = parseFilename(filename);
    const ok =
      result.trackNumber === expected.trackNumber &&
      JSON.stringify(result.artists) === JSON.stringify(expected.artists) &&
      result.title === expected.title;

    if (ok) {
      passed++;
      console.log(`  ✓ ${filename}`);
    } else {
      console.log(`  ✗ ${filename}`);
      console.log(`    Expected: track=${expected.trackNumber} artists=${JSON.stringify(expected.artists)} title="${expected.title}"`);
      console.log(`    Got:      track=${result.trackNumber} artists=${JSON.stringify(result.artists)} title="${result.title}"`);
    }
  });

  console.log(`\n${passed}/${cases.length} tests passed.\n`);
  process.exit(passed === cases.length ? 0 : 1);
}

main();
