import { NextResponse } from 'next/server';
import { verifyRecruiterSession } from '@/lib/auth/recruiterAuth';

export async function GET(request: Request) {
  try {
    const session = await verifyRecruiterSession(request);
    if (!session.authenticated) {
      const statusCode = session.isApproved === false ? 403 : 401;
      const response = NextResponse.json({ error: session.error || 'Unauthorized' }, { status: statusCode });
      if (statusCode === 401) {
        response.cookies.set('sb-access-token', '', {
          path: '/',
          maxAge: 0,
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      }
      return response;
    }

    return NextResponse.json({
      user: {
        id: session.recruiterId,
        email: session.email,
        fullName: session.fullName || 'Recruiter',
        companyName: session.companyName,
        role: session.role,
        isApproved: session.isApproved ?? true,
      },
      authenticated: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
