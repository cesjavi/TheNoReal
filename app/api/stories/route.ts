import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { StoryConfig, validateStoryConfig } from '@/lib/story-config';

export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!validateStoryConfig(data)) {
    return NextResponse.json({ error: 'Invalid story config' }, { status: 400 });
  }

  try {
    const story = await prisma.story.create({ data: data as StoryConfig });
    return NextResponse.json(story);
  } catch (err) {
    console.error('Error creating story', err);
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }
}
