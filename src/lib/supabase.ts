/**
 * src/lib/supabase.ts
 * Supabase client — single shared instance for the entire app.
 * All database and auth calls go through this client.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Hard fail at module load — misconfigured env means nothing will work
  console.error('[Swara] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:   true,   // stores session in localStorage automatically
    autoRefreshToken: true,   // refreshes JWT before expiry — keeps user logged in
    detectSessionInUrl: false, // we don't use magic links
  },
});
