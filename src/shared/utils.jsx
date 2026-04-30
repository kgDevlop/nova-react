import { APPS, _app } from "../shell/registry";

// ── ID + time helpers ─────────────────────────────────────────────────────

export const _uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const _ago = (ms) => new Date(Date.now() - ms);

// Human-readable relative time. Falls back to a short month/day after a week.
export const _rel = (d) => {
  const diff = Date.now() - d;
  const m = Math.floor(diff / 6e4);
  const h = Math.floor(diff / 36e5);
  const dy = Math.floor(diff / 864e5);

  if (m < 1) {
    return "Just now";
  }
  if (m < 60) {
    return `${m}m ago`;
  }
  if (h < 24) {
    return `${h}h ago`;
  }
  if (dy < 7) {
    return `${dy}d ago`;
  }
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Document filtering / sorting ──────────────────────────────────────────

export const _filterQ = (docs, q) => {
  const lq = q.trim().toLowerCase();
  if (!lq) {
    return docs;
  }
  return docs.filter(d => d.title.toLowerCase().includes(lq));
};

export const _filterV = (docs, v) => {
  // Calendar is a singleton — never surface it in browse/search listings.
  const browseable = docs.filter(d => d.type !== "calendar");
  if (APPS.map(a => a.id).includes(v)) {
    return browseable.filter(d => d.type === v);
  }
  if (v === "starred") {
    return browseable.filter(d => d.starred);
  }
  return browseable;
};

export const _sortD = (docs, by) => {
  return [...docs].sort((a, b) => {
    if (by === "modified") {
      return b.modified - a.modified;
    }
    if (by === "name") {
      return a.title.localeCompare(b.title);
    }
    return a.type.localeCompare(b.type);
  });
};

// ── View titles + doc factories ───────────────────────────────────────────

const VIEW_TITLES = {
  home: "Home",
  starred: "Starred",
  all: "All documents",
  catalogue: "App catalogue",
  writer: "Writer",
  sheets: "Sheets",
  slides: "Slides",
  draw: "Draw",
  forms: "Forms",
  pdf: "PDF",
  database: "Database",
  analytics: "Analytics",
  mail: "Mail",
  list: "List",
  whiteboard: "Whiteboard",
  video: "Video",
  code: "Code",
  api: "API",
};

export const _vtitle = (v) => VIEW_TITLES[v] ?? "Home";

export const _mk = (defs) => defs.map(d => ({ id: _uid(), starred: false, content: "", ...d }));

export const _autoName = (type) => {
  const def = _app(type);
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${def.label} — ${date}`;
};

// Pick a non-conflicting title within (type, docs), suffixing " (n)" as needed.
export const _uniqueTitle = (docs, type, desired, excludeId = null) => {
  const taken = new Set(
    docs
      .filter(d => d.type === type && d.id !== excludeId)
      .map(d => d.title),
  );

  if (!taken.has(desired)) {
    return desired;
  }

  // Strip any existing " (n)" suffix so we don't pile them up.
  const base = desired.replace(/ \(\d+\)$/, "");
  let n = 2;
  while (taken.has(`${base} (${n})`)) {
    n++;
  }
  return `${base} (${n})`;
};

// §14a element id generator (used by canvas editors).
export const _elId = () => Math.random().toString(36).slice(2, 8);
