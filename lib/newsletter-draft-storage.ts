/**
 * Browser-only persistence for the admin subscriber newsletter composer.
 * Named drafts + autosave; not synced across devices.
 */

const AUTOSAVE_KEY = "mrks-newsletter-editor-autosave-v1";
const NAMED_KEY = "mrks-newsletter-named-drafts-v1";
const MAX_NAMED = 25;

export type NewsletterEditorState = {
  subject: string;
  message: string;
  itemIds: string[];
};

export type NamedNewsletterDraft = NewsletterEditorState & {
  id: string;
  name: string;
  updatedAt: string;
};

export type NewsletterAutosave = NewsletterEditorState & {
  updatedAt: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("[newsletter-draft] localStorage write failed:", e);
  }
}

export function saveNewsletterAutosave(state: NewsletterEditorState): void {
  const payload: NewsletterAutosave = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  writeJson(AUTOSAVE_KEY, { version: 1, ...payload });
}

export function loadNewsletterAutosave(): NewsletterAutosave | null {
  const v = readJson<{
    version?: number;
    subject?: unknown;
    message?: unknown;
    itemIds?: unknown;
    updatedAt?: unknown;
  } | null>(AUTOSAVE_KEY, null);
  if (!v || v.version !== 1) return null;
  return {
    subject: typeof v.subject === "string" ? v.subject : "",
    message: typeof v.message === "string" ? v.message : "",
    itemIds: Array.isArray(v.itemIds)
      ? v.itemIds.filter((x): x is string => typeof x === "string")
      : [],
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : "",
  };
}

export function clearNewsletterAutosave(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadNamedNewsletterDrafts(): NamedNewsletterDraft[] {
  const v = readJson<{ version?: number; drafts?: unknown }>(NAMED_KEY, {});
  if (v.version !== 1 || !Array.isArray(v.drafts)) return [];
  return v.drafts.filter((d): d is NamedNewsletterDraft => {
    if (!d || typeof d !== "object") return false;
    const o = d as Record<string, unknown>;
    return (
      typeof o.id === "string" &&
      typeof o.name === "string" &&
      typeof o.subject === "string" &&
      typeof o.message === "string" &&
      Array.isArray(o.itemIds) &&
      typeof o.updatedAt === "string"
    );
  });
}

export function saveNamedNewsletterDraft(draft: NamedNewsletterDraft): void {
  const drafts = loadNamedNewsletterDrafts().filter((d) => d.id !== draft.id);
  drafts.unshift(draft);
  while (drafts.length > MAX_NAMED) drafts.pop();
  writeJson(NAMED_KEY, { version: 1, drafts });
}

export function deleteNamedNewsletterDraft(id: string): void {
  const drafts = loadNamedNewsletterDrafts().filter((d) => d.id !== id);
  writeJson(NAMED_KEY, { version: 1, drafts });
}

export function newDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
