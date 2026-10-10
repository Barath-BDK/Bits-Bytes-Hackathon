"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { KINDS, type Kind } from "@/lib/issues";
import { KindBadge } from "@/components/kind-icon";

export type Submitted = { cluster_id: string; joined_existing: boolean; report_count: number; reporter_count: number };

type Props = {
  point: { lat: number; lng: number } | null;
  onPoint: (p: { lat: number; lng: number }) => void;
  onCancel: () => void;
  onSubmitted: (r: Submitted) => void;
};

const EASE = [0.2, 0.8, 0.2, 1] as const;

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

const field = "mt-1.5 w-full rounded-xl border border-line bg-surface-2/70 px-3 py-2.5 text-sm outline-none transition focus:border-accent";

export function ReportSheet({ point, onPoint, onCancel, onSubmitted }: Props) {
  const [kind, setKind] = useState<Kind>("pothole");
  const [severity, setSeverity] = useState(2);
  const [note, setNote] = useState("");
  const [department, setDepartment] = useState("");
  const [promisedEnd, setPromisedEnd] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Submitted | null>(null);
  const [mini, setMini] = useState(false); // phones: shrink to a bar while placing the pin

  function locate() {
    if (!navigator.geolocation) return setError("Location isn't available here. Tap the map to place the pin.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setError(null); onPoint({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { setLocating(false); setError("Couldn't get your location. Search for the place or tap the map instead."); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function choosePhoto(f: File | null) {
    // Gallery picks can be anything: check the browser can decode it now, not at submit time.
    if (f) {
      if (!f.type.startsWith("image/") || f.size > 30_000_000) return setError("Choose an image under 30 MB.");
      const bmp = await createImageBitmap(f).catch(() => null);
      if (!bmp) return setError("This photo's format can't be read in this browser. Try a JPEG or PNG.");
      bmp.close();
      setError(null);
    }
    setPhoto(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!point) return setError("Place the pin first: use your location, search, or tap the map.");
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

  if (mini) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3, ease: EASE }}
        className="panel absolute inset-x-3 bottom-[78px] z-40 flex items-center gap-3 rounded-[10px] !bg-surface p-3 shadow-2xl">
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-medium">{point ? "Pin placed" : "Tap the map to place the pin"}</span>
          <span className="block truncate text-xs text-fg-3">{point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}. Drag it to adjust.` : "You can also search above."}</span>
        </span>
        <button onClick={() => setMini(false)} className="shrink-0 rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg">{point ? "Continue" : "Back"}</button>
      </motion.div>
    );
  }

  return (
    <motion.div data-lenis-prevent
      initial={{ opacity: 0, x: -24, filter: "blur(8px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.4, ease: EASE }}
      className="panel absolute inset-x-3 bottom-[78px] z-40 !bg-surface max-h-[64%] overflow-y-auto overscroll-contain rounded-[10px] p-5 shadow-2xl sm:bottom-24 sm:left-3 sm:right-auto sm:top-3 sm:max-h-none sm:w-[390px]">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" role="status" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: EASE }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.1 }}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-ok text-bg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
            </motion.div>
            <p className="label mt-5 text-fg-3">{done.joined_existing ? "Merged with an existing issue" : "New issue logged"}</p>
            <p className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em]">
              {done.joined_existing ? `You're reporter number ${done.reporter_count}.` : "You're the first to report this."}
            </p>
            <p className="mt-2 text-sm text-fg-2">
              {done.joined_existing
                ? `Your report joined ${done.report_count - 1} earlier ${done.report_count === 2 ? "report" : "reports"} at this spot, so its priority just went up.`
                : "When neighbours report the same spot, it will rise up the list."}
            </p>
            <button onClick={() => onSubmitted(done)} className="mt-6 w-full rounded-xl bg-fg py-3 font-medium text-bg transition hover:opacity-85">See it on the map</button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} exit={{ opacity: 0, scale: 0.98 }}>
            <div className="flex items-center justify-between">
              <p className="label text-fg-3">New report</p>
              <button type="button" onClick={onCancel} className="label text-fg-3 transition hover:text-fg">Cancel</button>
            </div>

            <fieldset className="mt-3">
              <legend className="text-2xl font-semibold tracking-[-0.04em]">What did you see?</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(KINDS) as Kind[]).map((k) => (
                  <label key={k} className={`relative cursor-pointer rounded-xl border px-1.5 py-3 text-center text-[13px] transition ${kind === k ? "border-accent bg-surface-2" : "border-line hover:border-fg-3"}`}>
                    <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                    <span className="mx-auto mb-2 block w-fit"><KindBadge kind={k} size={34} /></span>
                    {KINDS[k].label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="label text-fg-2">Where</legend>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={locate} disabled={locating}
                  className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm transition hover:border-fg-3 disabled:opacity-50">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                  {locating ? "Locating" : "Use my location"}
                </button>
                <button type="button" onClick={() => setMini(true)} className="rounded-xl border border-line px-3 py-2 text-sm transition hover:border-fg-3 sm:hidden">Pick on map</button>
                <span className="hidden text-xs text-fg-3 sm:inline">or search above, or tap the map</span>
              </div>
              <AnimatePresence>
                {point && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="label mt-2 text-accent">
                    Pinned at {point.lat.toFixed(5)}, {point.lng.toFixed(5)}. Drag to adjust.
                  </motion.p>
                )}
              </AnimatePresence>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="label text-fg-2">How bad</legend>
              <div className="relative mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
                {KINDS[kind].severity.map((label, i) => (
                  <label key={label} className={`relative z-10 cursor-pointer rounded-lg px-2 py-2 text-center text-[13px] transition ${severity === i + 1 ? "text-bg" : "text-fg-2"}`}>
                    <input type="radio" name="severity" checked={severity === i + 1} onChange={() => setSeverity(i + 1)} className="sr-only" />
                    {severity === i + 1 && <motion.span layoutId="sev-pill" className="absolute inset-0 -z-10 rounded-lg bg-fg" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <AnimatePresence>
              {kind === "worksite" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <label className="mt-5 block text-sm">
                    <span className="label text-fg-2">Agency on the signboard</span>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={120} placeholder="For example, Chennai Metrowater" className={field} />
                  </label>
                  <label className="mt-3 block text-sm">
                    <span className="label text-fg-2">Promised completion date</span>
                    <input type="date" value={promisedEnd} onChange={(e) => setPromisedEnd(e.target.value)} className={field} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5">
              <span className="label text-fg-2">Photo, optional</span>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-line p-3">
                {preview
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  ? <img src={preview} alt="Selected photo" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                    </span>}
                <div className="min-w-0 flex-1">
                  {/* capture opens the camera on phones; the second input opens the gallery or file picker */}
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-[8px] border border-line bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:border-fg-3">
                      {photo ? "Retake" : "Take photo"}
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)} className="sr-only" />
                    </label>
                    <label className="cursor-pointer rounded-[8px] border border-line px-3 py-1.5 text-sm font-medium transition hover:border-fg-3">
                      {photo ? "Choose another" : "From gallery"}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)} className="sr-only" />
                    </label>
                  </div>
                  <span className="mt-1.5 block text-xs text-fg-3">Location data is stripped before storage.</span>
                </div>
              </div>
            </div>

            <label className="mt-5 block text-sm">
              <span className="label text-fg-2">Note, optional</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Landmark, lane, how long it has been there" className={`${field} resize-none`} />
            </label>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl bg-alert/12 px-3 py-2.5 text-sm text-alert" role="alert">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-3 font-medium text-bg transition hover:opacity-85 disabled:opacity-50">
              {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />}
              {busy ? "Submitting" : "Submit report"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
