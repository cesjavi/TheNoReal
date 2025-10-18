'use client';
import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import StoryForm from './components/StoryForm';

export default function Home() {
    const [showSplash, setShowSplash] = useState(true);
  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <StoryForm />
    </>
  );
}

