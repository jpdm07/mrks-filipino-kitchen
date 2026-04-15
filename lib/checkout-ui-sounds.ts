/**
 * Short UI “click” via Web Audio (no MP3). Safe to call from submit after validation;
 * requires a user gesture chain in most browsers.
 */
export function playOrderSubmitClick(): void {
  if (typeof window === "undefined") return;
  const Ctor =
    window.AudioContext ||
    (
      window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!Ctor) return;

  try {
    const ctx = new Ctor();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.045);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(650, t + 0.038);
    g2.gain.setValueAtTime(0, t + 0.038);
    g2.gain.linearRampToValueAtTime(0.09, t + 0.042);
    g2.gain.exponentialRampToValueAtTime(0.0008, t + 0.1);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(t + 0.038);
    osc2.stop(t + 0.11);

    ctx.resume?.().catch(() => {});
  } catch {
    /* ignore */
  }
}
