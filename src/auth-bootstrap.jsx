import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cyyanndxveuyiphrizhi.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1AUslzH1HW2pIR8HZIazrA_QIGtzuvQ';

// Bootstrap auth before the main React app mounts. This is important when
// Google redirects back with OAuth tokens/code: Supabase gets a chance to
// initialize the session and persist it before main.jsx calls getSession().
const auth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

async function bootstrap() {
  try {
    const { data: initialized, error: initError } = await auth.auth.initialize();
    if (initError) console.error('SalonNow auth initialization failed:', initError.message);

    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      const { error } = await auth.auth.exchangeCodeForSession(code);
      if (error) console.error('SalonNow OAuth code exchange failed:', error.message);
    }

    const { data: sessionData, error: sessionError } = await auth.auth.getSession();
    if (sessionError) console.error('SalonNow session restore failed:', sessionError.message);
    if (initialized?.session || sessionData?.session) {
      console.info('SalonNow authenticated session restored.');
    }

    // Remove OAuth callback parameters/tokens from the visible URL.
    if (window.location.search.includes('code=') || window.location.hash.includes('access_token=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } catch (error) {
    console.error('SalonNow auth bootstrap error:', error);
  }

  await import('./main.jsx');
}

bootstrap();
