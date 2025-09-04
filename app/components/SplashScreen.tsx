'use client';

import Image from 'next/image';

export default function SplashScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <Image
        src="/pluma.svg"
        alt="TheNoReal logo"
        width={192}
        height={192}
        className="splash-logo"
        priority
      />
    </div>
  );
}

