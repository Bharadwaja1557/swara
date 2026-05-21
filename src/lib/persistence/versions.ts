/**
 * src/lib/persistence/versions.ts
 *
 * Typed schemas for each persisted storage version.
 * Adding a new version = add a new interface here + a migration in migrations.ts.
 *
 * CURRENT STORAGE VERSION: 3
 *
 * Version history:
 *   1 — swara_playback        (original, no version field, minimal fields)
 *   2 — swara_playback_v2     (added queueContext, originalQueueIds — still no version field)
 *   3 — swara_playback_v3     (adds explicit schemaVersion, restructured for forward compat)
 *
 * Future versions only need to extend V3 and add a migration function.
 */

import type { RepeatMode, QueueContext } from '@/types/music';

export const CURRENT_SCHEMA_VERSION = 3;
export const STORAGE_KEY = 'swara_playback_v3';

// ─── V1 (legacy) ─────────────────────────────────────────────────────────────
export interface SchemaV1 {
  // no schemaVersion field — detect by absence
  trackId?:     string;
  queueIds?:    string[];
  idx?:         number;
  shuffle?:     boolean;
  repeat?:      string;
  volume?:      number;
  timestamp?:   number;
}

// ─── V2 (legacy) ─────────────────────────────────────────────────────────────
export interface SchemaV2 {
  // no schemaVersion field — detect by presence of queueContext
  trackId?:          string | null;
  queueIds?:         string[];
  originalQueueIds?: string[];
  idx?:              number;
  shuffle?:          boolean;
  repeat?:           string;
  volume?:           number;
  timestamp?:        number;
  queueContext?:     QueueContext | null;
}

// ─── V3 (current) ─────────────────────────────────────────────────────────────
export interface SchemaV3 {
  schemaVersion:    3;
  trackId:          string | null;
  queueIds:         string[];
  originalQueueIds: string[];
  idx:              number;
  shuffle:          boolean;
  repeat:           RepeatMode;
  volume:           number;
  timestamp:        number;
  queueContext:     QueueContext | null;
}

export type AnySchema = SchemaV1 | SchemaV2 | SchemaV3;
