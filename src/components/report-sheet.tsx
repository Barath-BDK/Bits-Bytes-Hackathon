"use client";

import { useState } from "react";
import { KINDS, type Kind } from "@/lib/issues";

export type Submitted = { cluster_id: string; joined_existing: boolean; report_count: number; reporter_count: number };

type Props = {
  point: { lat: number; lng: number } | null;
  onPoint: (p: { lat: number; lng: number }) => void;
  onCancel: () => void;
  onSubmitted: (r: Submitted) => void;
};

// Shrink on the device first: phone photos are often 4-8 MB and the API accepts up to 4 MB.
async function downscale(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.85));
}

export function ReportSheet({ point, onPoint, onCancel, onSubmitted }: Props) {
  const [kind, setKind] = useState<Kind>("pothole");
  const [severity, setSeverity] = useState(2);
  const [note, setNote] = useState("");
  const [department, setDepartment] = useState("");
  const [promisedEnd, setPromisedEnd] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Submitted | null>(null);

  function locate() {
    if (!navigator.geolocation) return setError("Location isn't available here. Tap the map to place the pin.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setError(null); onPoint({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { setLocating(false); setError("Couldn't get your location. Tap the map to place the pin instead."); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!point) return setError("Place the pin first: use your location or tap the map.");
    setBusy(true);
    setError(null);
    try {
      let photoUrl: string | undefined;
      if (photo) {
        const fd = new FormData();
        fd.append("photo", await downscale(photo), "photo.jpg");
        const up = await fetch("/api/photos", { method: "POST", body: fd });
        const upBody = await up.json();
        if (!up.ok) throw new Error(upBody.error ?? "Photo upload failed");
        photoUrl = upBody.url;
      }
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind, severity, lat: point.lat, lng: point.lng,
          note: note || undefined,
          department: kind === "worksite" && department ? department : undefined,
          promisedEnd: kind === "worksite" && promisedEnd ? promisedEnd : undefined,
          photo: photoUrl,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not submit");
      setDone(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const panel = "rise absolute inset-x-3 bottom-3 z-20 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-rule bg-paper p-5 shadow-[var(--shadow)] sm:left-4 sm:right-auto sm:top-4 sm:bottom-auto sm:w-[380px]";

  if (done) {
    return (
      <div className={panel} role="status">
        <p className="kicker text-ink-3">{done.joined_existing ? "Merged with an existing issue" : "New issue logged"}</p>
        <p className="mt-2 font-display text-3xl leading-tight">
          {done.joined_existing ? `You're reporter #${done.reporter_count}.` : "You're the first to report this."}
        </p>
        <p className="mt-2 text-sm text-ink-2">
          {done.joined_existing
            ? `Your report joined ${done.report_count - 1} earlier report${done.report_count === 2 ? "" : "s"} at this spot, so its priority just went up.`
            : "When neighbours report the same spot, it will rise up the list."}
        </p>
        <button onClick={() => onSubmitted(done)} className="mt-4 w-full rounded-full bg-ink py-2.5 font-medium text-paper">See it on the map</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={panel} data-lenis-prevent>
      <div className="flex items-center justify-between">
        <p className="kicker text-ink-3">New report</p>
        <button type="button" onClick={onCancel} className="kicker text-ink-3 hover:text-ink">Cancel ✕</button>
      </div>

      <fieldset className="mt-3">
        <legend className="font-display text-2xl">What did you see?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <label key={k} className={`cursor-pointer rounded-xl border-2 p-2.5 text-center text-sm transition ${kind === k ? "border-ink bg-paper-2" : "border-rule hover:border-ink-3"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <span className={`mx-auto mb-1.5 block h-3.5 w-3.5 ${k === "worksite" ? "rounded-[3px]" : "rounded-full"}`} style={{ background: KINDS[k].color }} />
              {KINDS[k].label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="kicker text-ink-2">Where</legend>
        <div className="mt-1.5 flex items-center gap-2">
          <button type="button" onClick={locate} disabled={locating} className="rounded-full border border-ink px-3.5 py-1.5 text-sm hover:bg-paper-2 disabled:opacity-50">
            {locating ? "Locating…" : "Use my location"}
          </button>
          <span className="text-xs text-ink-3">or tap the map, then drag the pin</span>
        </div>
        {point && <p className="kicker mt-2 text-ink-2">Pinned · {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>}
      </fieldset>

      <fieldset className="mt-4">
        <legend className="kicker text-ink-2">How bad</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {KINDS[kind].severity.map((label, i) => (
            <label key={label} className={`cursor-pointer rounded-lg border px-2 py-1.5 text-center text-sm ${severity === i + 1 ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink-3"}`}>
              <input type="radio" name="severity" checked={severity === i + 1} onChange={() => setSeverity(i + 1)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "worksite" && (
        <div className="mt-4 grid gap-2">
          <label className="text-sm">
            <span className="kicker text-ink-2">Agency on the signboard</span>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={120} placeholder="e.g. Chennai Metrowater"
              className="mt-1 w-full rounded-lg border border-rule bg-paper-2 px-3 py-2 outline-none focus:border-ink" />
          </label>
          <label className="text-sm">
            <span className="kicker text-ink-2">Promised completion date</span>
            <input type="date" value={promisedEnd} onChange={(e) => setPromisedEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rule bg-paper-2 px-3 py-2 outline-none focus:border-ink" />
          </label>
        </div>
      )}

      <label className="mt-4 block text-sm">
        <span className="kicker text-ink-2">Photo (optional)</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-paper-3 file:px-3 file:py-1.5 file:text-ink" />
        <span className="mt-1 block text-xs text-ink-3">Location data is stripped from photos before they are stored.</span>
      </label>

      <label className="mt-4 block text-sm">
        <span className="kicker text-ink-2">Note (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Landmark, lane, how long it's been there"
          className="mt-1 w-full resize-none rounded-lg border border-rule bg-paper-2 px-3 py-2 outline-none focus:border-ink" />
      </label>

      {error && <p className="mt-3 rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert" role="alert">{error}</p>}

      <button disabled={busy} className="mt-4 w-full rounded-full bg-ink py-2.5 font-medium text-paper hover:opacity-90 disabled:opacity-50">
        {busy ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
