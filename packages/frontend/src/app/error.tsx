'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center border border-black/[0.06]">
        <span className="text-lg">!</span>
      </div>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-black">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-black/45">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="mt-4 border border-black/15 px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white"
      >
        Try again
      </button>
    </div>
  );
}
