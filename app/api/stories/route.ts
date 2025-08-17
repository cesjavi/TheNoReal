import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeStoryConfig } from '@/lib/story-config';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = normalizeStoryConfig(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const story = await prisma.story.create({ data: parsed.data });
    return NextResponse.json(story, { status: 201 });
  } catch (err) {
    console.error('Error creating story', err);
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }
}
