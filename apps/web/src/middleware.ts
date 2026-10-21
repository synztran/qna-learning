import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (['/sw.js', '/manifest.webmanifest', '/offline.html'].includes(pathname) || pathname.startsWith('/icons/')) {
    return NextResponse.next();
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env not provided yet, allow access to preview / demo
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  const loginRedirect = (reason: string) => {
    const result = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url), 303);
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    return result;
  };

  if (user) {
    const { data: current, error: sessionError } = await supabase.rpc('is_current_session');
    if (sessionError || current !== true) {
      // A stale session must be allowed to submit fresh credentials on /login.
      // Do not call global signOut: that could revoke the newer device's session.
      if (isLoginPage) return response;
      return loginRedirect(sessionError ? 'session_unavailable' : 'session_replaced');
    }
    // Check if soft banned
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.is_banned) {
      if (isLoginPage) return response;
      return loginRedirect(profile?.is_banned ? 'banned' : 'session_unavailable');
    }

    if (isLoginPage && request.method === 'GET') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    // Protected routes
    if (!isLoginPage && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
