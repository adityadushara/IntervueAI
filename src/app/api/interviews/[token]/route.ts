import { NextResponse } from 'next/server';
import { getServerInterviewByToken, upsertServerInterview } from '@/lib/serverStore';
import { InterviewInvitation } from '@/types/interview';

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const found = getServerInterviewByToken(token);
    if (!found) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json(found);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve interview' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const updates: Partial<InterviewInvitation> = await request.json();
    const existing = getServerInterviewByToken(token);
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const merged: InterviewInvitation = {
      ...existing,
      ...updates,
      token: existing.token, // cannot change token
      id: existing.id,
    };

    const saved = upsertServerInterview(merged);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
  }
}
