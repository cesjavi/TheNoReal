'use client';

import StoryForm from './components/StoryForm';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';


export default function Home() {
  return <StoryForm />;
}

