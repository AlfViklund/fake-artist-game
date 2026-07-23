import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_URLS = [
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, ''),
  'https://psxtjturnobyhtnfzrlx.supabase.co',
  'https://jvhcvgzdjlbxcetlfrwn.supabase.co'
].filter(Boolean);

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathStr = resolvedParams.path ? resolvedParams.path.join('/') : '';
  const search = req.nextUrl.search;

  let lastError: any = null;

  for (const baseUrl of CANDIDATE_URLS) {
    const targetUrl = `${baseUrl}/${pathStr}${search}`;

    const requestHeaders = new Headers();
    req.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        requestHeaders.set(key, value);
      }
    });

    try {
      const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined;

      const res = await fetch(targetUrl, {
        method: req.method,
        headers: requestHeaders,
        body,
        cache: 'no-store',
      });

      // If we got a valid HTTP response (even 4xx/5xx from Supabase), return it!
      const responseHeaders = new Headers();
      res.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      const responseData = await res.arrayBuffer();

      return new NextResponse(responseData, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });
    } catch (err: any) {
      lastError = { baseUrl, message: err.message, cause: String(err.cause) };
    }
  }

  return NextResponse.json({
    error: 'All Supabase candidates failed',
    lastError,
    candidates: CANDIDATE_URLS
  }, { status: 502 });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
