'use client';

import { useCallback } from 'react';
import SplashScreen from './components/SplashScreen';

export default function Loading() {
  const handleOnFinish = useCallback(() => {
    console.log('Loading finished');
  }, []);
  return <SplashScreen onFinish={handleOnFinish} />;
}

