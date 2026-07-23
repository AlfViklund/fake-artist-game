import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwjqcmuzylsjskozpzkh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_p3ikxZoI_gyHgpsBxVkPEQ_ZMlEqDUR';

export const supabase = createClient(rawUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (url, options) => {
      let fetchUrl = String(url);
      if (typeof window !== 'undefined' && fetchUrl.includes('/rest/v1/')) {
        const pathAndQuery = fetchUrl.substring(fetchUrl.indexOf('/rest/v1/'));
        fetchUrl = `${window.location.origin}/api/supabase${pathAndQuery}`;
      }
      return fetch(fetchUrl, options);
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 60,
    },
  },
});
