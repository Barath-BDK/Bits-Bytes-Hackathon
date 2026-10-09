export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6" aria-busy="true" aria-label="Loading record">
      <div className="skeleton h-4 w-28" />
      <div className="mt-8 grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="skeleton h-7 w-48" />
          <div className="skeleton mt-6 h-14 w-full max-w-2xl" />
          <div className="skeleton mt-3 h-14 w-3/4 max-w-xl" />
          <div className="skeleton mt-5 h-5 w-80" />
        </div>
        <div className="skeleton h-56" />
      </div>
      <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="skeleton aspect-[16/9]" />
        <div className="skeleton h-72" />
      </div>
    </main>
  );
}
