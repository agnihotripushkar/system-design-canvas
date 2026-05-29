"use client";

import { useState } from "react";
import type { Requirements } from "@/types/domain";

type Tab = "functional" | "nonFunctional" | "constraints" | "assumptions" | "scale";

const TAB_LABEL: Record<Tab, string> = {
  functional: "Functional",
  nonFunctional: "Non-Functional",
  constraints: "Constraints",
  assumptions: "Assumptions",
  scale: "Scale",
};

const TAB_ORDER: Tab[] = ["functional", "nonFunctional", "constraints", "assumptions", "scale"];

export type QuestionPanelProps = {
  title: string;
  question: string;
  requirements: Requirements;
  onClose?: () => void;
};

export function QuestionPanel({ title, question, requirements, onClose }: QuestionPanelProps) {
  const [tab, setTab] = useState<Tab>("functional");

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Close requirements panel"
              title="Close panel"
            >
              ×
            </button>
          ) : null}
        </div>
        <details className="group mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          <summary className="cursor-pointer select-none text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            Show full question
          </summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{question}</p>
        </details>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        {TAB_ORDER.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 transition ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
        {tab === "scale" ? (
          <ScaleList scale={requirements.scaleEstimates} />
        ) : (
          <BulletList items={requirements[tab]} emptyLabel={`No ${TAB_LABEL[tab].toLowerCase()} listed.`} />
        )}
      </div>
    </aside>
  );
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2 leading-relaxed text-zinc-800 dark:text-zinc-200"
        >
          <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-zinc-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScaleList({ scale }: { scale: Requirements["scaleEstimates"] }) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Daily active users", value: scale.dau },
    { label: "Queries per second", value: scale.qps },
    { label: "Storage per year", value: scale.storagePerYear },
    { label: "Read / write ratio", value: scale.readWriteRatio },
  ];
  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
            {row.value ? row.value : <span className="text-zinc-400">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
