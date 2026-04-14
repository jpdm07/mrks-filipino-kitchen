import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Suggestion } from "@prisma/client";
import { SUGGESTION_OPTIONS } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailableError } from "@/lib/safe-db";

const FILE_NAME = "suggestion-poll.json";

function dataPath() {
  return path.join(process.cwd(), "data", FILE_NAME);
}

type FileState = {
  version: 1;
  presetCounts: Record<string, number>;
  customs: { id: string; option: string; count: number }[];
};

function initialFileState(): FileState {
  const presetCounts: Record<string, number> = {};
  SUGGESTION_OPTIONS.forEach((_, i) => {
    presetCounts[`poll-${i}`] = 0;
  });
  return { version: 1, presetCounts, customs: [] };
}

function mergeFileState(raw: unknown): FileState {
  const base = initialFileState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<FileState>;
  return {
    version: 1,
    presetCounts: { ...base.presetCounts, ...(o.presetCounts ?? {}) },
    customs: Array.isArray(o.customs) ? o.customs : [],
  };
}

async function readFileState(): Promise<FileState> {
  try {
    const raw = await fs.readFile(dataPath(), "utf8");
    return mergeFileState(JSON.parse(raw) as unknown);
  } catch {
    return initialFileState();
  }
}

async function writeFileState(state: FileState): Promise<void> {
  const dir = path.dirname(dataPath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(dataPath(), JSON.stringify(state, null, 2), "utf8");
}

/** In-memory preset rows when DB is empty or unavailable (matches seed / FALLBACK_SUGGESTIONS ids). */
export function presetSuggestionsFromConfig(): Suggestion[] {
  return SUGGESTION_OPTIONS.map((option, i) => ({
    id: `poll-${i}`,
    option,
    count: 0,
    isCustom: false,
  }));
}

function fileStateToRows(state: FileState): Suggestion[] {
  const preset: Suggestion[] = SUGGESTION_OPTIONS.map((option, i) => {
    const id = `poll-${i}`;
    return {
      id,
      option,
      count: state.presetCounts[id] ?? 0,
      isCustom: false,
    };
  });
  const customs: Suggestion[] = state.customs
    .map((c) => ({
      id: c.id,
      option: c.option,
      count: c.count,
      isCustom: true,
    }))
    .sort((a, b) => a.option.localeCompare(b.option));
  return [...preset, ...customs];
}

async function suggestionsFromFileOrPresets(): Promise<Suggestion[]> {
  try {
    const state = await readFileState();
    const rows = fileStateToRows(state);
    if (rows.length > 0) return rows;
  } catch {
    /* ignore */
  }
  return presetSuggestionsFromConfig();
}

/** Preset poll options always follow `SUGGESTION_OPTIONS`; vote counts come from DB when present. */
function mergePresetSuggestionsWithDb(rows: Suggestion[]): Suggestion[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const presets: Suggestion[] = SUGGESTION_OPTIONS.map((option, i) => {
    const id = `poll-${i}`;
    const db = byId.get(id);
    return {
      id,
      option,
      count: db?.count ?? 0,
      isCustom: false,
    };
  });
  const customs = rows
    .filter((r) => r.isCustom)
    .sort((a, b) => a.option.localeCompare(b.option));
  return [...presets, ...customs];
}

export async function listSuggestions(): Promise<Suggestion[]> {
  try {
    const rows = await prisma.suggestion.findMany({
      orderBy: [{ isCustom: "asc" }, { option: "asc" }],
    });
    if (rows.length > 0) return mergePresetSuggestionsWithDb(rows);
    return await suggestionsFromFileOrPresets();
  } catch {
    return await suggestionsFromFileOrPresets();
  }
}

export async function addSuggestionVotes(
  votes: string[],
  writeIn?: string
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      for (const id of votes) {
        await tx.suggestion.updateMany({
          where: { id, isCustom: false },
          data: { count: { increment: 1 } },
        });
      }
      const w = (writeIn ?? "").trim();
      if (w) {
        const existing = await tx.suggestion.findFirst({
          where: { option: w, isCustom: true },
        });
        if (existing) {
          await tx.suggestion.update({
            where: { id: existing.id },
            data: { count: { increment: 1 } },
          });
        } else {
          await tx.suggestion.create({
            data: { option: w, count: 1, isCustom: true },
          });
        }
      }
    });
  } catch (err) {
    if (!isDatabaseUnavailableError(err)) throw err;
    await addVotesToFile(votes, writeIn);
  }
}

async function addVotesToFile(votes: string[], writeIn?: string): Promise<void> {
  const state = await readFileState();
  for (const id of votes) {
    if (state.presetCounts[id] !== undefined) {
      state.presetCounts[id] = (state.presetCounts[id] ?? 0) + 1;
    } else {
      const c = state.customs.find((x) => x.id === id);
      if (c) c.count += 1;
    }
  }
  const w = (writeIn ?? "").trim();
  if (w) {
    const existing = state.customs.find(
      (c) => c.option.toLowerCase() === w.toLowerCase()
    );
    if (existing) {
      existing.count += 1;
    } else {
      state.customs.push({
        id: `custom-${Date.now()}-${randomBytes(4).toString("hex")}`,
        option: w,
        count: 1,
      });
    }
  }
  await writeFileState(state);
}

export async function clearSuggestionPoll(): Promise<void> {
  try {
    await prisma.suggestion.deleteMany({ where: { isCustom: true } });
    await prisma.suggestion.updateMany({ data: { count: 0 } });
  } catch (err) {
    if (!isDatabaseUnavailableError(err)) throw err;
    await writeFileState(initialFileState());
  }
}
