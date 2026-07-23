import type { NextConfig } from "next";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://psxtjturnobyhtnfzrlx.supabase.co';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: `${rawSupabaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
