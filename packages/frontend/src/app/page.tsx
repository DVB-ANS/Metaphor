'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollFloat from '@/components/ui/scroll-float';
import BlurText from '@/components/ui/blur-text';

gsap.registerPlugin(ScrollTrigger);

function useFadeIn(
  sectionRef: React.RefObject<HTMLElement | null>,
  imageRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    if (!section || !image) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        image,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '30% top',
            scrub: true,
            pin: false,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [sectionRef, imageRef]);
}

export default function LandingPage() {
  const router = useRouter();
  const section1Ref = useRef<HTMLElement>(null);
  const image1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const image2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLElement>(null);
  const image3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLElement>(null);
  const image4Ref = useRef<HTMLDivElement>(null);

  useFadeIn(section1Ref, image1Ref);
  useFadeIn(section2Ref, image2Ref);
  useFadeIn(section3Ref, image3Ref);
  useFadeIn(section4Ref, image4Ref);

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#FDFDFD';
    document.body.style.backgroundColor = '#FDFDFD';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="bg-[#FDFDFD]" style={{ overscrollBehavior: 'none' }}>
      {/* Top bar — fixed */}
      <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-end px-8 py-6">
        <button
          onClick={() => router.push('/app')}
          className="bg-black px-5 py-2 text-sm font-medium text-[#FDFDFD] transition-colors duration-200 hover:bg-black/80"
        >
          Launch App
        </button>
      </header>

      {/* Hero — full viewport */}
      <section className="flex h-screen flex-col items-center justify-center px-8">
        <BlurText
          text="Metaphor"
          delay={150}
          animateBy="letters"
          direction="top"
          stepDuration={0.4}
          className="font-[family-name:var(--font-title)] font-normal leading-[0.95] tracking-[0.02em] text-black"
          style={{ fontSize: 'clamp(3rem, 12vw, 14rem)' }}
        />
        <p className="mt-6 font-display text-sm font-light tracking-[0.08em] uppercase text-black/30">
          Confidential & Automated RWA Hub for Institutional Finance
        </p>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 animate-bounce">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-black/20"
          >
            <path
              d="M12 5v14M5 12l7 7 7-7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </div>
      </section>

      {/* Section 1 — Fuji: text left, image right */}
      <section ref={section1Ref} className="relative h-[450vh]">
        <div className="sticky top-0 flex h-screen items-center px-16">
          <div className="grid w-full grid-cols-2 items-center gap-16">
            <div>
              <ScrollFloat
                as="span"
                className="font-[family-name:var(--font-title)] text-xs tracking-[0.15em] uppercase text-black/30"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                01 — Institutional Tokenization
              </ScrollFloat>
              <ScrollFloat
                as="h2"
                className="mt-4 font-[family-name:var(--font-title)] text-3xl font-normal leading-tight tracking-[-0.01em] text-black"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                Real-World Assets, On-Chain.
              </ScrollFloat>
              <ScrollFloat
                as="p"
                className="mt-5 max-w-md font-display text-base leading-relaxed text-black/45"
                animationDuration={0.6}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.008}
              >
                Tokenize bonds, invoices, and loans with embedded metadata. Every asset is KYC-gated and fractionizable, designed for institutional-grade compliance.
              </ScrollFloat>
            </div>

            <div ref={image1Ref} className="w-full max-w-3xl opacity-0">
              <Image
                src="/fuji_cerisier.png"
                alt="Mont Fuji"
                width={1920}
                height={1080}
                className="h-auto w-full object-contain"
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Sentier: image left, text right */}
      <section ref={section2Ref} className="relative h-[400vh]">
        <div className="sticky top-0 flex h-screen items-center px-16">
          <div className="grid w-full grid-cols-2 items-center gap-16">
            <div ref={image2Ref} className="flex w-full max-w-xl -mt-12 justify-center opacity-0">
              <Image
                src="/sentier.jpg"
                alt="Monk on a cliff"
                width={800}
                height={1200}
                className="h-auto max-h-[85vh] w-auto object-contain"
                priority={false}
              />
            </div>

            <div>
              <ScrollFloat
                as="span"
                className="font-[family-name:var(--font-title)] text-xs tracking-[0.15em] uppercase text-black/30"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                02 — Confidential Negotiations
              </ScrollFloat>
              <ScrollFloat
                as="h2"
                className="mt-4 font-[family-name:var(--font-title)] text-3xl font-normal leading-tight tracking-[-0.01em] text-black"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                Privacy-First Trading.
              </ScrollFloat>
              <ScrollFloat
                as="p"
                className="mt-5 max-w-md font-display text-base leading-relaxed text-black/45"
                animationDuration={0.6}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.008}
              >
                Negotiate bilateral trades in confidential vaults. Only the parties involved see the data — auditors get compliance access, nothing more.
              </ScrollFloat>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Barque: text left, image right */}
      <section ref={section3Ref} className="relative h-[400vh]">
        <div className="sticky top-0 flex h-screen items-center px-16">
          <div className="grid w-full grid-cols-2 items-center gap-16">
            <div>
              <ScrollFloat
                as="span"
                className="font-[family-name:var(--font-title)] text-xs tracking-[0.15em] uppercase text-black/30"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                03 — Automated Yields
              </ScrollFloat>
              <ScrollFloat
                as="h2"
                className="mt-4 font-[family-name:var(--font-title)] text-3xl font-normal leading-tight tracking-[-0.01em] text-black"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                Coupons Without Cron Jobs.
              </ScrollFloat>
              <ScrollFloat
                as="p"
                className="mt-5 max-w-md font-display text-base leading-relaxed text-black/45"
                animationDuration={0.6}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.008}
              >
                Schedule coupon payments directly from smart contracts. Pro-rata yield distribution, automatic recalculation on transfers — fully on-chain, no off-chain servers.
              </ScrollFloat>
            </div>

            <div ref={image3Ref} className="w-full max-w-xl opacity-0">
              <Image
                src="/barque.jpg"
                alt="Fisherman on a lake"
                width={1920}
                height={1920}
                className="h-auto w-full object-contain"
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Koi: image left, text right */}
      <section ref={section4Ref} className="relative h-[300vh]">
        <div className="sticky top-0 flex h-screen items-center px-16">
          <div className="grid w-full grid-cols-2 items-center gap-16">
            <div ref={image4Ref} className="flex w-full max-w-xl justify-center opacity-0">
              <Image
                src="/koi.jpg"
                alt="Koi fish"
                width={800}
                height={1200}
                className="h-auto max-h-[85vh] w-auto object-contain"
                priority={false}
              />
            </div>

            <div>
              <ScrollFloat
                as="span"
                className="font-[family-name:var(--font-title)] text-xs tracking-[0.15em] uppercase text-black/30"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                04 — AI Risk Analysis
              </ScrollFloat>
              <ScrollFloat
                as="h2"
                className="mt-4 font-[family-name:var(--font-title)] text-3xl font-normal leading-tight tracking-[-0.01em] text-black"
                animationDuration={0.8}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.02}
              >
                Intelligence, Not Guesswork.
              </ScrollFloat>
              <ScrollFloat
                as="p"
                className="mt-5 max-w-md font-display text-base leading-relaxed text-black/45"
                animationDuration={0.6}
                ease="power2.out"
                scrollStart="top bottom"
                scrollEnd="top center"
                stagger={0.008}
              >
                On-demand AI scoring of vault composition, stress testing under crisis scenarios, and actionable recommendations — always with human approval before execution.
              </ScrollFloat>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom section */}
      <section className="flex flex-col items-center justify-center px-8 pb-32 pt-16">
        <p className="max-w-lg text-center font-display text-lg font-light leading-relaxed tracking-wide text-black/40">
          Tokenize, negotiate privately, automate yields — all from one institutional-grade platform.
        </p>
        <button
          onClick={() => router.push('/app')}
          className="mt-10 border border-black bg-transparent px-8 py-3 font-[family-name:var(--font-title)] text-sm tracking-[0.05em] text-black transition-colors duration-200 hover:bg-black hover:text-[#FDFDFD]"
        >
          Get Started
        </button>
      </section>
    </div>
  );
}
