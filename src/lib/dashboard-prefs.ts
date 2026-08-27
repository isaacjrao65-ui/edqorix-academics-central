import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Per-role dashboard layout memory: which sections are collapsed, the last
 * active tab and the last scroll position. Stored locally per browser so each
 * role returns to exactly the view they left.
 */
export type DashboardPrefs = {
  collapsed: Record<string, boolean>;
  tab: string;
  scrollTop: number;
};

const EMPTY: DashboardPrefs = { collapsed: {}, tab: "", scrollTop: 0 };

function storageKey(role: string) {
  return `edqorix.dashboard.${role}`;
}

function read(role: string): DashboardPrefs {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(role));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
    return {
      collapsed: parsed.collapsed ?? {},
      tab: typeof parsed.tab === "string" ? parsed.tab : "",
      scrollTop: typeof parsed.scrollTop === "number" ? parsed.scrollTop : 0,
    };
  } catch {
    return EMPTY;
  }
}

function write(role: string, prefs: DashboardPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(role), JSON.stringify(prefs));
  } catch {
    /* storage unavailable — preferences simply are not remembered */
  }
}

function scrollParent(node: HTMLElement | null): HTMLElement | Window | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const style = window.getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return window;
}

export function useDashboardPrefs(role: string, defaultTab = "") {
  const [prefs, setPrefs] = useState<DashboardPrefs>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    const stored = read(role);
    setPrefs({ ...stored, tab: stored.tab || defaultTab });
    setHydrated(true);
    restored.current = false;
  }, [role, defaultTab]);

  const update = useCallback(
    (patch: Partial<DashboardPrefs>) => {
      setPrefs((current) => {
        const next = { ...current, ...patch };
        write(role, next);
        return next;
      });
    },
    [role],
  );

  const toggleSection = useCallback(
    (key: string) => {
      setPrefs((current) => {
        const next = {
          ...current,
          collapsed: { ...current.collapsed, [key]: !current.collapsed[key] },
        };
        write(role, next);
        return next;
      });
    },
    [role],
  );

  const isCollapsed = useCallback((key: string) => Boolean(prefs.collapsed[key]), [prefs.collapsed]);
  const setTab = useCallback((tab: string) => update({ tab }), [update]);

  // Restore, then continuously remember, the scroll position of this dashboard.
  useEffect(() => {
    if (!hydrated) return undefined;
    const target = scrollParent(containerRef.current);
    if (!target) return undefined;

    const getTop = () => (target instanceof Window ? window.scrollY : target.scrollTop);
    const setTop = (top: number) =>
      target instanceof Window ? window.scrollTo({ top }) : (target.scrollTop = top);

    if (!restored.current) {
      restored.current = true;
      const saved = prefs.scrollTop;
      if (saved > 0) {
        const id = window.setTimeout(() => setTop(saved), 60);
        window.setTimeout(() => window.clearTimeout(id), 400);
      }
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const top = getTop();
        setPrefs((current) => {
          const next = { ...current, scrollTop: top };
          write(role, next);
          return next;
        });
      });
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // prefs.scrollTop is intentionally read once, at restore time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, role]);

  return { prefs, hydrated, containerRef, toggleSection, isCollapsed, setTab, update };
}
