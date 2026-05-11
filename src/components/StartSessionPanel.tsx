"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_LABEL,
  type BankQuestion,
  type QuestionCategory,
} from "@/lib/question-bank";

type Mode = "bank" | "custom";

const TRACK_ORDER: QuestionCategory[] = ["backend", "android", "ios"];

const DIFFICULTY_BADGE: Record<BankQuestion["difficulty"], string> = {
  easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  hard: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export type StartSessionPanelProps = {
  bank: BankQuestion[];
};

export function StartSessionPanel({ bank }: StartSessionPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("bank");
  const [activeTrack, setActiveTrack] = useState<QuestionCategory>("backend");
  const [search, setSearch] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bank
      .filter((b) => b.category === activeTrack)
      .filter((b) => {
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) ||
          b.prompt.toLowerCase().includes(q) ||
          (b.tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      });
  }, [bank, activeTrack, search]);

  const startSession = async (question: string, key: string) => {
    setError(null);
    setPendingId(key);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, generateRequirements: true }),
      });
      const json = (await res.json()) as { session?: { id: string }; error?: string };
      if (!res.ok || !json.session) {
        throw new Error(json.error ?? "Failed to create session");
      }
      router.push(`/practice/${json.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setPendingId(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPrompt.trim();
    if (trimmed.length < 3) {
      setError("Please enter a question (3+ characters).");
      return;
    }
    void startSession(trimmed, "custom");
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <ModeTab active={mode === "bank"} onClick={() => setMode("bank")}>
          Question bank
        </ModeTab>
        <ModeTab active={mode === "custom"} onClick={() => setMode("custom")}>
          Start your own
        </ModeTab>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {mode === "bank" ? (
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-1">
              {TRACK_ORDER.map((track) => {
                const count = bank.filter((b) => b.category === track).length;
                const active = activeTrack === track;
                return (
                  <button
                    key={track}
                    type="button"
                    onClick={() => setActiveTrack(track)}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {CATEGORY_LABEL[track]}
                    <span
                      className={`ml-1.5 text-xs ${
                        active ? "opacity-70" : "text-zinc-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
            <input
              type="search"
              placeholder="Filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.length === 0 ? (
              <li className="col-span-full rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No questions match your search.
              </li>
            ) : (
              filtered.map((q) => {
                const pending = pendingId === q.id;
                return (
                  <li
                    key={q.id}
                    className="flex flex-col rounded-lg border border-zinc-200 p-3 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {q.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${DIFFICULTY_BADGE[q.difficulty]}`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {q.prompt}
                    </p>
                    {q.tags && q.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {q.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("custom");
                          setCustomPrompt(q.prompt);
                        }}
                        disabled={pending}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      >
                        Edit before starting
                      </button>
                      <button
                        type="button"
                        onClick={() => void startSession(q.prompt, q.id)}
                        disabled={pendingId !== null}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {pending ? "Generating..." : "Start"}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="space-y-3 p-4">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Paste or type a system design question..."
            rows={5}
            disabled={pendingId !== null}
            className="w-full resize-none rounded-md border border-zinc-300 bg-white p-3 text-sm leading-relaxed shadow-sm focus:border-zinc-500 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Requirements are generated by Claude. First load may take a few seconds.
            </p>
            <button
              type="submit"
              disabled={pendingId !== null}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pendingId === "custom" ? "Generating..." : "Start session"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
