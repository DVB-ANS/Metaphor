'use client';

import { useRouter } from 'next/navigation';
import TiltedCard from '@/components/ui/tilted-card';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      {/* Background layer — giant title + subtitle anchored top-left, full-width */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 w-screen overflow-hidden select-none">
        <h1 className="whitespace-nowrap text-[22.5vw] font-bold leading-none tracking-[-0.04em] text-[#fafafa]">
          Metaphor
        </h1>
      </div>

      {/* Foreground layer — centered logo + caption */}
      <div className="relative z-10 opacity-70">
        <TiltedCard
          imageSrc="/logo.png"
          altText="Metaphor"
          captionText="Metaphor"
          containerHeight="560px"
          containerWidth="560px"
          imageHeight="400px"
          imageWidth="400px"
          scaleOnHover={1.1}
          rotateAmplitude={12}
          showMobileWarning={false}
          showTooltip={false}
          displayOverlayContent
          overlayContent={
            <div className="flex h-full w-full items-end justify-center pb-5">
              <p className="rounded-md bg-black/50 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
                <em>Denali</em>, Mount McKinley
              </p>
            </div>
          }
        />
      </div>

      {/* Launch App button — fixed at bottom */}
      <div className="absolute bottom-16 z-10">
        <button
          onClick={() => router.push('/app')}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          Launch App
          <span className="inline-block w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100">
            &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}
