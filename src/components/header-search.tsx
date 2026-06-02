import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useTranslation } from "@/i18n";
import { searchNavItems, useNavGroups } from "@/i18n/nav";

export function HeaderSearch() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const navGroups = useNavGroups();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = searchNavItems(navGroups, query);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    void navigate({ to });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx].to);
    }
  };

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("header.searchMenu")}
        className="h-8 w-56 rounded-md border border-panel-border bg-background/40 pl-8 pr-3 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary/60"
      />
      {open && query.trim() && (
        <div className="absolute left-0 top-full z-[110] mt-1 w-72 overflow-hidden rounded-md border border-panel-border bg-page shadow-xl">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-muted">{t("header.searchNoResult")}</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((item, idx) => (
                <li key={item.to}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => go(item.to)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left transition ${
                      idx === activeIdx ? "bg-primary/15 text-primary" : "text-foreground hover:bg-panel"
                    }`}
                  >
                    <span className="text-xs font-medium">{item.label}</span>
                    <span className="text-[10px] text-text-muted">{item.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
