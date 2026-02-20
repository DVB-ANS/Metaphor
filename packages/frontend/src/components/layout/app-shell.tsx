'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { DitherShader } from '@/components/ui/dither-shader';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  // Landing page: render children directly without app chrome
  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Full-screen dither background */}
      <div className="fixed inset-0 z-0">
        <DitherShader
          waveSpeed={0.05}
          waveFrequency={3}
          waveAmplitude={0.3}
          waveColor={[0.5, 0.5, 0.5]}
          colorNum={4}
          pixelSize={3}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={1}
        />
      </div>

      {/* App content on top */}
      <div className="relative z-10 flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
