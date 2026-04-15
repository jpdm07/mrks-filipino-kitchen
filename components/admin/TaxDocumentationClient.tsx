"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TaxMileageLog, TaxSupportingEntry } from "@prisma/client";

function ymdToday() {
  return new Date().toISOString().slice(0, 10);
}

function ymdYearStart() {
  const y = new Date().getUTCFullYear();
  return `${y}-01-01`;
}

const SUPPORTING_SUGGESTIONS = [
  "Equipment / tools",
  "Software & subscriptions",
  "Bank & payment processing fees",
  "Licenses & permits",
  "Professional fees (CPA, legal)",
  "Insurance",
  "Home office (notes only — ask CPA)",
  "Parking / tolls (with mileage)",
  "Repairs & maintenance",
  "Other",
];

type MileageRow = TaxMileageLog;
type SupportingRow = TaxSupportingEntry;

export function TaxDocumentationClient() {
  const [startDate, setStartDate] = useState(ymdYearStart);
  const [endDate, setEndDate] = useState(ymdToday);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [mileage, setMileage] = useState<MileageRow[]>([]);
  const [entries, setEntries] = useState<SupportingRow[]>([]);

  const [mDate, setMDate] = useState(ymdToday);
  const [mMiles, setMMiles] = useState("");
  const [mPurpose, setMPurpose] = useState("");
  const [mFrom, setMFrom] = useState("");
  const [mTo, setMTo] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [editingMileageId, setEditingMileageId] = useState<string | null>(null);

  const [eDate, setEDate] = useState(ymdToday);
  const [eCategory, setECategory] = useState("Other");
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eNotes, setENotes] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setErr(null);
    const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const [mRes, eRes] = await Promise.all([
      fetch(`/api/admin/tax-mileage?${q}`, { credentials: "include" }),
      fetch(`/api/admin/tax-supporting?${q}`, { credentials: "include" }),
    ]);
    if (!mRes.ok || !eRes.ok) {
      setErr("Could not load mileage or supporting entries.");
      return;
    }
    const mj = (await mRes.json()) as { mileage?: MileageRow[] };
    const ej = (await eRes.json()) as { entries?: SupportingRow[] };
    setMileage(Array.isArray(mj.mileage) ? mj.mileage : []);
    setEntries(Array.isArray(ej.entries) ? ej.entries : []);
  }, [startDate, endDate]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const download = (format: "zip" | "html") => {
    const q = new URLSearchParams({
      startDate,
      endDate,
      format,
    });
    window.open(`/api/admin/tax-export?${q.toString()}`, "_blank", "noopener,noreferrer");
  };

  const resetMileageForm = () => {
    setEditingMileageId(null);
    setMDate(ymdToday());
    setMMiles("");
    setMPurpose("");
    setMFrom("");
    setMTo("");
    setMNotes("");
  };

  const startEditMileage = (r: MileageRow) => {
    setEditingMileageId(r.id);
    setMDate(r.date);
    setMMiles(String(r.miles));
    setMPurpose(r.purpose);
    setMFrom(r.routeFrom ?? "");
    setMTo(r.routeTo ?? "");
    setMNotes(r.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveMileage = async () => {
    setMsg(null);
    setErr(null);
    const miles = Number(mMiles);
    const payload = {
      date: mDate,
      miles,
      purpose: mPurpose.trim(),
      routeFrom: mFrom.trim() || null,
      routeTo: mTo.trim() || null,
      notes: mNotes.trim() || null,
    };
    const url = editingMileageId
      ? `/api/admin/tax-mileage/${encodeURIComponent(editingMileageId)}`
      : "/api/admin/tax-mileage";
    const res = await fetch(url, {
      method: editingMileageId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setErr(data.error ?? "Save failed");
      return;
    }
    setMsg(editingMileageId ? "Mileage trip updated." : "Mileage trip saved.");
    resetMileageForm();
    void loadLists();
  };

  const deleteMileage = async (id: string) => {
    if (!window.confirm("Delete this mileage entry?")) return;
    const res = await fetch(`/api/admin/tax-mileage/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    if (editingMileageId === id) resetMileageForm();
    void loadLists();
  };

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEDate(ymdToday());
    setECategory("Other");
    setETitle("");
    setEDesc("");
    setEAmount("");
    setENotes("");
  };

  const startEditEntry = (r: SupportingRow) => {
    setEditingEntryId(r.id);
    setEDate(r.date);
    setECategory(r.category);
    setETitle(r.title);
    setEDesc(r.description ?? "");
    setEAmount(r.amount != null ? String(r.amount) : "");
    setENotes(r.notes ?? "");
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const saveEntry = async () => {
    setMsg(null);
    setErr(null);
    const payload: Record<string, unknown> = {
      date: eDate,
      category: eCategory.trim(),
      title: eTitle.trim(),
      description: eDesc.trim() || null,
      notes: eNotes.trim() || null,
    };
    if (eAmount.trim() === "") {
      payload.amount = null;
    } else {
      const a = Number(eAmount);
      if (!Number.isFinite(a)) {
        setErr("Amount must be a number or empty.");
        return;
      }
      payload.amount = a;
    }
    const url = editingEntryId
      ? `/api/admin/tax-supporting/${encodeURIComponent(editingEntryId)}`
      : "/api/admin/tax-supporting";
    const res = await fetch(url, {
      method: editingEntryId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setErr(data.error ?? "Save failed");
      return;
    }
    setMsg(editingEntryId ? "Entry updated." : "Entry saved.");
    resetEntryForm();
    void loadLists();
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm("Delete this supporting entry?")) return;
    const res = await fetch(`/api/admin/tax-supporting/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    if (editingEntryId === id) resetEntryForm();
    void loadLists();
  };

  return (
    <div className="mt-6 space-y-10">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0038A8]">
          What this page does
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
          Export a <strong>ZIP</strong> or <strong>HTML</strong> packet for your records:{" "}
          <strong>all orders</strong> in the date range (including demo rows—flagged—
          and non-confirmed statuses), <strong>expenses</strong> from{" "}
          <Link href="/admin/finances" className="font-semibold text-[var(--primary)] underline">
            Finances
          </Link>
          , your <strong>mileage log</strong>, and <strong>supporting notes</strong> you add
          below. Orders are filtered by <em>order placed date</em> (created date), not pickup
          date. This is <strong>not tax or legal advice</strong>—give the files to your CPA
          or EA. IRS standard mileage rates change yearly (see Publication 463).
        </p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0038A8]">
          Report period &amp; download
        </h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block text-sm font-semibold">
            Start
            <input
              type="date"
              className="mt-1 block min-h-11 rounded-lg border border-[var(--border)] px-3"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            End
            <input
              type="date"
              className="mt-1 block min-h-11 rounded-lg border border-[var(--border)] px-3"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="min-h-11 rounded-lg bg-[var(--primary)] px-4 font-bold text-white hover:opacity-90"
            onClick={() => void loadLists()}
          >
            Refresh lists
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800"
            onClick={() => download("zip")}
          >
            Download ZIP (CSV + HTML + summary)
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border-2 border-[var(--primary)] px-4 font-bold text-[var(--primary)] hover:bg-[var(--gold-light)]"
            onClick={() => download("html")}
          >
            Download HTML only (print / Save as PDF)
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          ZIP includes UTF-8 BOM CSVs for Excel, a text summary, and a printable HTML report.
        </p>
      </section>

      {msg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0038A8]">
          Mileage log
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Log each trip (ingredient shopping, supply runs, occasional delivery). Your CPA
          applies the correct IRS mileage rate for the year.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold">
            Date
            <input
              type="date"
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Miles
            <input
              type="number"
              min={0.1}
              step={0.1}
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={mMiles}
              onChange={(e) => setMMiles(e.target.value)}
              placeholder="e.g. 12.4"
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2 lg:col-span-1">
            Purpose
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={mPurpose}
              onChange={(e) => setMPurpose(e.target.value)}
              placeholder="HEB — ingredient shopping"
            />
          </label>
          <label className="text-sm font-semibold">
            From (optional)
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={mFrom}
              onChange={(e) => setMFrom(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            To (optional)
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={mTo}
              onChange={(e) => setMTo(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Notes
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={mNotes}
              onChange={(e) => setMNotes(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white"
            onClick={() => void saveMileage()}
          >
            {editingMileageId ? "Update trip" : "Add trip"}
          </button>
          {editingMileageId ? (
            <button
              type="button"
              className="rounded-lg border px-4 py-2 font-semibold"
              onClick={resetMileageForm}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <th className="p-2">Date</th>
                <th className="p-2">Miles</th>
                <th className="p-2">Purpose</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mileage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-[var(--text-muted)]">
                    No trips in this date range.
                  </td>
                </tr>
              ) : (
                mileage.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]">
                    <td className="p-2 whitespace-nowrap">{r.date}</td>
                    <td className="p-2">{r.miles}</td>
                    <td className="p-2">{r.purpose}</td>
                    <td className="p-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-2 text-[var(--primary)] underline"
                        onClick={() => startEditMileage(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-700 underline"
                        onClick={() => void deleteMileage(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0038A8]">
          Supporting entries
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Anything else to document: equipment, fees, license renewals, home-office notes,
          etc. Amount is optional if you only need a paper trail.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Date
            <input
              type="date"
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={eDate}
              onChange={(e) => setEDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Category
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              list="tax-supporting-cats"
              value={eCategory}
              onChange={(e) => setECategory(e.target.value)}
            />
            <datalist id="tax-supporting-cats">
              {SUPPORTING_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Title
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              placeholder="Short label for your records"
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Description
            <textarea
              className="mt-1 w-full rounded-lg border px-2 py-2"
              rows={2}
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Amount ($) optional
            <input
              type="number"
              step={0.01}
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={eAmount}
              onChange={(e) => setEAmount(e.target.value)}
              placeholder="Leave blank if N/A"
            />
          </label>
          <label className="text-sm font-semibold">
            Notes
            <input
              className="mt-1 w-full min-h-11 rounded-lg border px-2"
              value={eNotes}
              onChange={(e) => setENotes(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white"
            onClick={() => void saveEntry()}
          >
            {editingEntryId ? "Update entry" : "Add entry"}
          </button>
          {editingEntryId ? (
            <button
              type="button"
              className="rounded-lg border px-4 py-2 font-semibold"
              onClick={resetEntryForm}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-section)]">
                <th className="p-2">Date</th>
                <th className="p-2">Category</th>
                <th className="p-2">Title</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-[var(--text-muted)]">
                    No entries in this date range.
                  </td>
                </tr>
              ) : (
                entries.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]">
                    <td className="p-2 whitespace-nowrap">{r.date}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">{r.title}</td>
                    <td className="p-2">
                      {r.amount != null ? `$${r.amount.toFixed(2)}` : "—"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="mr-2 text-[var(--primary)] underline"
                        onClick={() => startEditEntry(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-700 underline"
                        onClick={() => void deleteEntry(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
