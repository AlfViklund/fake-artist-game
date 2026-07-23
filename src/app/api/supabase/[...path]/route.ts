import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwjqcmuzylsjskozpzkh.supabase.co').trim().replace(/\/$/, '');

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathStr = resolvedParams.path ? resolvedParams.path.join('/') : '';
  const search = req.nextUrl.search;

  const targetUrl = `${SUPABASE_URL}/${pathStr}${search}`;

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
    console.error('Supabase Proxy Error:', err);
    return NextResponse.json({
      error: err.message || 'Proxy Error',
      targetUrl,
      cause: err.cause ? String(err.cause) : null,
    }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
