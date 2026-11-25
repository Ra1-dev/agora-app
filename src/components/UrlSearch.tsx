"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import styles from "./UrlSearch.module.css";

/** Search box that keeps its value in the URL (?q=) and updates it as you type. */
export function UrlSearch({ label, placeholder, id }: { label: string; placeholder: string; id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  const push = (q: string) => {
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else {
      next.delete("q");
      next.delete("sort");
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  return (
    <form
      role="search"
      className={styles.search}
      onSubmit={(e) => {
        e.preventDefault();
        window.clearTimeout(timer.current);
        push(value);
      }}
    >
      <label htmlFor={id} className="ag-sr-only">
        {label}
      </label>
      <Icon name="search" className={styles.searchIcon} />
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          const q = e.target.value;
          setValue(q);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => push(q), 300);
        }}
      />
      {value ? (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            setValue("");
            push("");
          }}
        >
          <Icon name="close" size={18} />
          <span className="ag-sr-only">Clear search</span>
        </button>
      ) : null}
    </form>
  );
}
