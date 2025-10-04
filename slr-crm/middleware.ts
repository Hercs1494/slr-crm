import { NextResponse } from 'next/server';

export function middleware(req: Request) {
  const url = new URL(req.url);
  const isAdminPath = /^\/(quotes|admin|\(dashboard\))/.test(url.pathname);
  if (!isAdminPath) return NextResponse.next();

  const cookie = (req.headers.get('cookie') || '').split(';').find(c => c.trim().startsWith('slr_admin='));
  if (!cookie) return NextResponse.redirect(new URL('/admin/login', req.url));

  const token = cookie.split('=')[1];
  // do a light verify here (non-crypto) to avoid importing node crypto in edge; server will re-verify anyway
  if (!token || token.split('.').length !== 2) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/quotes/:path*', '/admin/:path*', '/(dashboard)/:path*'],
};
