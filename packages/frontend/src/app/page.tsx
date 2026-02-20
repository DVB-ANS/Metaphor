'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Lenis from 'lenis';
import GlassSurface from '@/components/ui/glass-surface';
import LogoLoop from '@/components/ui/logo-loop';

const partnerLogos = [
  { src: '/logos/adi-foundation.svg', alt: 'ADI Foundation', title: 'ADI Foundation' },
  { src: '/logos/canton-network.svg', alt: 'Canton Network', title: 'Canton Network' },
  { src: '/logos/ethereum.png', alt: 'Ethereum', title: 'Ethereum' },
  { src: '/logos/0g-labs.svg', alt: '0G Labs', title: '0G Labs' },
  { src: '/logos/openzeppelin.svg', alt: 'OpenZeppelin', title: 'OpenZeppelin' },
];

const images = [
  { src: '/mount1.jpeg', alt: 'Mountain landscape' },
  { src: '/mount2.jpeg', alt: 'Mountain landscape' },
  { src: '/mount3.jpeg', alt: 'Mountain landscape' },
];

export default function LandingPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const glassTextRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef({ w: 0, h: 0, scale: 0.4 });

  const measure = useCallback(() => {
    const title = titleRef.current;
    const glassText = glassTextRef.current;
    if (!title || !glassText) return;

    dimsRef.current.w = title.offsetWidth;
    dimsRef.current.h = title.offsetHeight;

    const gs = parseFloat(getComputedStyle(glassText).fontSize);
    const ts = parseFloat(getComputedStyle(title).fontSize);
    dimsRef.current.scale = ts > 0 ? gs / ts : 0.4;
  }, []);

  const update = useCallback((progress: number) => {
    const glass = glassRef.current;
    const glassText = glassTextRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const btn = buttonRef.current;
    if (!glass || !glassText || !title || !btn) return;

    const { w, h, scale: cs } = dimsRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Phase boundaries
    const P1 = 0.5; // images done scrolling — glass text disappears, title takes over
    const P2 = 0.78; // title animation done

    // --- Glass bubble (fades out after P1) ---
    if (progress <= P1) {
      glass.style.opacity = '1';
      glassText.style.opacity = '1';
    } else if (progress <= P2) {
      const t = (progress - P1) / (P2 - P1);
      glass.style.opacity = String(Math.max(0, 1 - t));
      glassText.style.opacity = '0'; // instant hide — no overlap
    } else {
      glass.style.opacity = '0';
      glassText.style.opacity = '0';
    }

    // --- Title ---
    // Center position (matches glass text visual position)
    const cx = (vw - w * cs) / 2;
    const cy = (vh - h * cs) / 2;
    // Final position (top-left corner)
    const fx = 24;
    const fy = 24;

    if (progress <= P1) {
      // Hidden while glass text is showing
      title.style.opacity = '0';
      title.style.transform = `translate(${cx}px, ${cy}px) scale(${cs})`;
    } else if (progress <= P2) {
      const t = (progress - P1) / (P2 - P1);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      // Appears instantly at P1, then animates to final position
      title.style.opacity = '1';
      title.style.transform = `translate(${cx + (fx - cx) * e}px, ${cy + (fy - cy) * e}px) scale(${cs + (1 - cs) * e})`;
    } else {
      title.style.opacity = '1';
      title.style.transform = `translate(${fx}px, ${fy}px) scale(1)`;
    }

    // --- Subtitle (fades in after title settles) ---
    if (subtitle) {
      if (progress <= P2) {
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(8px)';
      } else {
        const t = Math.min(1, ((progress - P2) / (1 - P2)) * 1.5);
        const e = 1 - Math.pow(1 - t, 3);
        subtitle.style.opacity = String(e);
        subtitle.style.transform = `translateY(${8 * (1 - e)}px)`;
      }
    }

    // --- Button ---
    if (progress <= P2) {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    } else {
      const t = Math.min(1, ((progress - P2) / (1 - P2)) * 2);
      btn.style.opacity = String(t);
      btn.style.pointerEvents = t > 0.3 ? 'auto' : 'none';
    }

    // --- Logo loop ---
    const logos = logosRef.current;
    if (logos) {
      if (progress <= P2) {
        logos.style.opacity = '0';
      } else {
        const t = Math.min(1, ((progress - P2) / (1 - P2)) * 1.5);
        logos.style.opacity = String(t);
      }
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    measure();

    const lenis = new Lenis({
      wrapper: el,
      content: el.firstElementChild as HTMLElement,
      duration: 2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
      lerp: 0.1,
    });

    lenis.on('scroll', () => {
      const max = el.scrollHeight - el.clientHeight;
      update(max > 0 ? el.scrollTop / max : 0);
    });

    let raf: number;
    const animate = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    update(0);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [measure, update]);

  useEffect(() => {
    const onResize = () => {
      measure();
      const el = scrollRef.current;
      if (el) {
        const max = el.scrollHeight - el.clientHeight;
        update(max > 0 ? el.scrollTop / max : 0);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, update]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Scrollable content — images pass behind the fixed glass */}
      <div
        ref={scrollRef}
        className="relative h-full w-full overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        <div style={{ height: '400vh' }}>
          <div className="flex flex-col items-center gap-6 px-4 pt-[55vh]">
            {images.map((img, i) => (
              <div key={i} className="relative w-full max-w-[640px]">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={640}
                  height={360}
                  className="w-full rounded-[20px] object-cover grayscale"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed glass bubble with "Metaphor" text inside */}
      <div
        ref={glassRef}
        className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center"
        style={{ willChange: 'opacity' }}
      >
        <GlassSurface
          width="60%"
          height={120}
          borderRadius={50}
          borderWidth={0.07}
          brightness={50}
          opacity={0.93}
          blur={11}
          displace={0}
          backgroundOpacity={0}
          saturation={1}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
        >
          <span
            ref={glassTextRef}
            className="font-display text-[2rem] font-bold tracking-[-0.03em] text-white/90"
          >
            Metaphor
          </span>
        </GlassSurface>
      </div>

      {/* Animated title — cross-fades in from glass text, grows and moves to top-left */}
      <h1
        ref={titleRef}
        className="pointer-events-none fixed left-0 top-0 z-20 whitespace-nowrap font-display font-bold leading-[0.9] tracking-[-0.04em] text-white/90"
        style={{
          fontSize: 'clamp(5rem, 18vw, 25rem)',
          transformOrigin: 'top left',
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      >
        Metaphor
      </h1>

      {/* Subtitle — appears below the title at the end of scroll */}
      <p
        ref={subtitleRef}
        className="pointer-events-none fixed left-0 z-20 px-7 font-display text-sm font-light tracking-[0.08em] uppercase text-white/40"
        style={{
          top: 'calc(24px + clamp(5rem, 18vw, 25rem) * 0.9 + 0.5rem)',
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      >
        Confidential & Automated RWA Hub for Institutional Finance
      </p>

      {/* Launch App button — dead center of viewport, appears after scroll animation */}
      <div
        ref={buttonRef}
        className="fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: 0, pointerEvents: 'none' }}
      >
        <button
          onClick={() => router.push('/app')}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3.5 font-display text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          Launch App
          <span className="inline-block w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100">
            &rarr;
          </span>
        </button>
      </div>

      {/* Partner logo loop — fixed at bottom, visible after scroll */}
      <div
        ref={logosRef}
        className="fixed bottom-0 left-0 z-20 w-full"
        style={{ opacity: 0, willChange: 'opacity' }}
      >
        <div className="border-t border-white/5 py-8">
          <LogoLoop
            logos={partnerLogos}
            speed={40}
            direction="left"
            logoHeight={38}
            gap={100}
            hoverSpeed={15}
            fadeOut
            fadeOutColor="#000000"
            ariaLabel="Built with"
            className="[&_img]:brightness-0 [&_img]:invert [&_img]:opacity-40 [&_img]:hover:opacity-70 [&_img]:transition-opacity [&_img]:duration-300"
          />
        </div>
      </div>
    </div>
  );
}
