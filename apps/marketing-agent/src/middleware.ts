import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isValidJwtStructure(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('marketing_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    if (pathname === '/login' && token && isValidJwtStructure(token)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!token || !isValidJwtStructure(token)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_error|404|500).*)'],
};