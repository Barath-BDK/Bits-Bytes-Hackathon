export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-28 text-center sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton mx-auto h-7 w-64 rounded-full" />
      <div className="skeleton mx-auto mt-8 h-16 w-full max-w-3xl" />
      <div className="skeleton mx-auto mt-3 h-16 w-2/3 max-w-2xl" />
      <div className="skeleton mx-auto mt-16 h-80 max-w-5xl rounded-3xl" />
    </main>
  );
}
