/**
 * src/lib/persistence/migrations.ts
 *
 * Migration pipeline: raw localStorage JSON → typed SchemaV3.
 *
 * Each migration function takes the previous version and returns the next.
 * Migrations are pure functions — no side effects, no store access.
 *
 * Adding a new version:
 *   1. Add SchemaV4 to versions.ts
 *   2. Add migrateV3toV4() here
 *   3. Add it to the pipeline in runMigrations()
 *   4. Update CURRENT_SCHEMA_VERSION
 */

import type { SchemaV1, SchemaV2, SchemaV3 } from './versions';
import type { RepeatMode } from '@/types/music';

const DEV = import.meta.env.DEV;

function log(msg: string): void {
  if (DEV) console.log(`[Persistence] ${msg}`);
}

// ── V1 → V2 ──────────────────────────────────────────────────────────────────

function migrateV1toV2(v1: SchemaV1): SchemaV2 {
  log('Migrating playback state V1 → V2');
  return {
    trackId:          v1.trackId ?? null,
    queueIds:         v1.queueIds ?? [],
    originalQueueIds: v1.queueIds ?? [],   // best guess: original = active
    idx:              v1.idx ?? 0,
    shuffle:          v1.shuffle ?? false,
    repeat:           v1.repeat ?? 'off',
    volume:           v1.volume ?? 1,
    timestamp:        v1.timestamp ?? 0,
    queueContext:     null,
  };
}

// ── V2 → V3 ──────────────────────────────────────────────────────────────────

function migrateV2toV3(v2: SchemaV2): SchemaV3 {
  log('Migrating playback state V2 → V3');
  const repeat = (v2.repeat ?? 'off') as RepeatMode;
  return {
    schemaVersion:    3,
    trackId:          v2.trackId ?? null,
    queueIds:         v2.queueIds ?? [],
    originalQueueIds: v2.originalQueueIds ?? v2.queueIds ?? [],
    idx:              v2.idx ?? 0,
    shuffle:          v2.shuffle ?? false,
    repeat:           ['off', 'all', 'one'].includes(repeat) ? repeat : 'off',
    volume:           Math.max(0, Math.min(1, v2.volume ?? 1)),
    timestamp:        Math.max(0, v2.timestamp ?? 0),
    queueContext:     v2.queueContext ?? null,
  };
}

// ── Detect version from raw object ───────────────────────────────────────────

function detectVersion(raw: Record<string, unknown>): 1 | 2 | 3 {
  if (raw.schemaVersion === 3) return 3;
  // V2 has queueContext or originalQueueIds fields (even if null)
  if ('queueContext' in raw || 'originalQueueIds' in raw) return 2;
  return 1;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Parse raw localStorage JSON and migrate to current SchemaV3.
 * Returns null if the data is missing, corrupt, or unmigrateable.
 */
export function runMigrations(raw: string | null): SchemaV3 | null {
  if (!raw) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log('Failed to parse persisted playback state — discarding');
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    log('Persisted state is not an object — discarding');
    return null;
  }

  try {
    const version = detectVersion(parsed);
    log(`Detected schema version: ${version}`);

    let v2: SchemaV2;
    if (version === 1) {
      v2 = migrateV1toV2(parsed as SchemaV1);
    } else if (version === 2) {
      v2 = parsed as SchemaV2;
    } else {
      // Already V3
      return parsed as unknown as SchemaV3;
    }

    return migrateV2toV3(v2);
  } catch (err) {
    log(`Migration failed: ${String(err)} — discarding`);
    return null;
  }
}

/**
 * Load and migrate playback state from all known storage keys.
 * Tries V3 key first, falls back to V2, then V1.
 * Returns null if nothing is found or everything is corrupt.
 */
export function loadAndMigratePlaybackState(): SchemaV3 | null {
  // Try current key first
  const v3Raw = localStorage.getItem('swara_playback_v3');
  if (v3Raw) {
    const result = runMigrations(v3Raw);
    if (result) return result;
  }

  // Fall back to V2 key
  const v2Raw = localStorage.getItem('swara_playback_v2');
  if (v2Raw) {
    log('Found legacy V2 key — migrating');
    const result = runMigrations(v2Raw);
    if (result) {
      // Promote to current key, clean up old
      try {
        localStorage.setItem('swara_playback_v3', JSON.stringify(result));
        localStorage.removeItem('swara_playback_v2');
      } catch {}
      return result;
    }
  }

  // Fall back to V1 key
  const v1Raw = localStorage.getItem('swara_playback');
  if (v1Raw) {
    log('Found legacy V1 key — migrating');
    const result = runMigrations(v1Raw);
    if (result) {
      try {
        localStorage.setItem('swara_playback_v3', JSON.stringify(result));
        localStorage.removeItem('swara_playback');
      } catch {}
      return result;
    }
  }

  return null;
}
