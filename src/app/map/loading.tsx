export default function Loading() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-surface" aria-busy="true" aria-label="Loading map">
      <div className="hairline-grid absolute inset-0" />
      <div className="panel absolute bottom-24 left-3 top-3 hidden w-[360px] rounded-2xl p-4 md:block">
        <div className="skeleton h-3 w-32" />
        <div className="mt-4 grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
        <div className="skeleton mt-3 h-9" />
        <div className="mt-4 space-y-2">{Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton h-14" />)}</div>
      </div>
      <div className="absolute left-3 right-3 top-3 flex gap-2 md:left-[384px]"><div className="skeleton h-11 flex-1 md:max-w-md" /><div className="skeleton h-11 w-24" /></div>
    </div>
  );
}
