/** Client + server: basic email shape check (not full RFC). */
export function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 5 || t.length > 254) return false;
  if (/\s/.test(t)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t);
}

/** US-oriented: require at least 10 digits (strip formatting). */
export function hasValidPhoneDigits(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15;
}
