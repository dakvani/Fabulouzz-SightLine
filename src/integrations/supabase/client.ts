import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Authoritative production Supabase project (support@fabulouzz.com)
export const AUTHORITATIVE_SUPABASE_URL = 'https://eekspekhsaxwfyanxxjn.supabase.co';
export const AUTHORITATIVE_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVla3NwZWtoc2F4d2Z5YW54eGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNTg0NTMsImV4cCI6MjEwNzgzNDQ1M30.85ikedMfjufO_-ZFJBL19qFpkw_3-cCHExSrFOdbRgU';

// Guard against legacy cached project IDs in environment variables
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_URL = (envUrl && !envUrl.includes('dxohbmgalsxswmpptyqy')) ? envUrl : AUTHORITATIVE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = (envKey && !envKey.includes('dxohbmgalsxswmpptyqy')) ? envKey : AUTHORITATIVE_SUPABASE_KEY;

// Clear legacy project session storage if present to prevent cross-project auth contamination
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.includes('dxohbmgalsxswmpptyqy')) {
        window.localStorage.removeItem(k);
      }
    }
  } catch (_) {}
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    },
  }
});