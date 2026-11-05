import { NextResponse } from 'next/server';
import { getServerInterviews, upsertServerInterview } from '@/lib/serverStore';
import { InterviewInvitation } from '@/types/interview';

/**
 * RECRUITER ENDPOINTS:
 * Notice: Currently in Sprint 1 Prototype Mode.
 * In Sprint 2 (Supabase Auth Integration), these endpoints MUST be guarded:
 * - GET /api/interviews: Requires authenticated recruiter session. Returns only interviews belonging to the recruiter's tenant/organization.
 * - POST /api/interviews: Requires authenticated recruiter session. Assigns recruiter_id from auth.uid().
 */

export async function GET() {
  try {
    // SPRINT 2 HOOK: Verify recruiter session via Supabase Auth here
    const interviews = getServerInterviews();
    return NextResponse.json(interviews);
  } catch (err) {
    console.error('Failed to retrieve interviews:', err);
    return NextResponse.json({ error: 'Failed to retrieve interviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // SPRINT 2 HOOK: Verify recruiter session and enforce role authorization here
    const body: InterviewInvitation = await request.json();
    if (!body || !body.token || !body.jobConfig) {
      return NextResponse.json({ error: 'Invalid interview data' }, { status: 400 });
    }

    const saved = upsertServerInterview(body);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('Failed to create interview:', err);
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
  }
}
