'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '../providers/LanguageProvider';

const IMAGES = {
  es: [ '/splash/splash1_es.png'],
  en: ['/splash/splash1_en.png'],
};

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { locale } = useLanguage();
  const lang = locale.split('-')[0] as 'es' | 'en';
  const src = IMAGES[lang][Math.floor(Math.random() * IMAGES[lang].length)];

  useEffect(() => {
    const id = setTimeout(onFinish, 3000);
    return () => clearTimeout(id);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]"
      onClick={onFinish}
    >
      <Image src={src} alt="splash" fill priority style={{ objectFit: 'contain' }} />
    </div>
  );
} 