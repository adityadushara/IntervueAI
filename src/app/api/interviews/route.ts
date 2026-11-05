import { NextResponse } from 'next/server';
import { getServerInterviews, upsertServerInterview } from '@/lib/serverStore';
import { InterviewInvitation } from '@/types/interview';

export async function GET() {
  try {
    const interviews = getServerInterviews();
    return NextResponse.json(interviews);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve interviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: InterviewInvitation = await request.json();
    if (!body || !body.token || !body.jobConfig) {
      return NextResponse.json({ error: 'Invalid interview data' }, { status: 400 });
    }

    const saved = upsertServerInterview(body);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
  }
}
