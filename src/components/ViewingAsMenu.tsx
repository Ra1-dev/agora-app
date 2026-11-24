"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { formatDay, formatTime, dayKey } from "@/lib/time";
import { shortName } from "@/lib/text";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import styles from "./ViewingAsMenu.module.css";

export type ViewingAsPerson = { id: string; name: string; title: string | null; organization: string | null };

type Props = {
  surface: "participant" | "desk";
  viewer: ViewingAsPerson;
  options: ViewingAsPerson[];
  /** The organizer account: on participant screens, picking it opens the organizer desk. */
  organizer: ViewingAsPerson;
  deskHref: string;
  participantHref: string;
  theme: "light" | "dark" | "system";
  clock: { now: number; timeZone: string; city: string; days: { key: string; label: string }[] };
};

async function post(url: string, body: unknown): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return { ok: false, message: data.error?.message ?? "We couldn't do that. Try again." };
}

function useDemoNow(initial: number) {
  const [offset] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);
  // `tick` re-renders; the value is derived from the real time elapsed since the server sent `initial`.
  void tick;
  return initial + (Date.now() - offset);
}

export function ViewingAsMenu({ surface, viewer, options, organizer, deskHref, participantHref, theme, clock }: Props) {
  const router = useRouter();
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const demoNow = useDemoNow(clock.now);
  const [day, setDay] = useState(() => dayKey(clock.now, clock.timeZone));
  const [time, setTime] = useState(() => formatTime(clock.now, clock.timeZone));

  // After the clock moves (here or in another tab), show the new time in the form.
  useEffect(() => {
    setDay(dayKey(clock.now, clock.timeZone));
    setTime(formatTime(clock.now, clock.timeZone));
  }, [clock.now, clock.timeZone]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onToggle = (e: Event) => setOpen((e as ToggleEvent).newState === "open");
    panel.addEventListener("toggle", onToggle);
    return () => panel.removeEventListener("toggle", onToggle);
  }, []);

  const run = (task: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.message ?? null);
        return;
      }
      if (after) after();
      else router.refresh();
    });
  };

  const choosePerson = (id: string) => {
    if (surface === "participant" && id === organizer.id) {
      run(() => post("/api/viewing-as", { surface: "desk", userId: id }), () => router.push(deskHref));
      return;
    }
    run(() => post("/api/viewing-as", { surface, userId: id }));
  };

  const people = surface === "participant" ? [...options, organizer] : options;
  const selectedId = viewer.id;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        popoverTarget={menuId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Viewing as ${viewer.name}. Change who you view the app as.`}
      >
        <Avatar name={viewer.name} />
      </button>

      <div ref={panelRef} id={menuId} popover="auto" className={styles.panel} role="dialog" aria-label="Viewing as">
        <section className={styles.section}>
          <h2 className={`${styles.heading} ag-label-caps`}>Viewing as</h2>
          <p className={styles.note}>No sign-in in this demo. Pick who to view the app as.</p>
          <ul className={styles.people} role="radiogroup" aria-label="Person">
            {people.map((p) => {
              const isOrganizerLink = surface === "participant" && p.id === organizer.id;
              const checked = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className={styles.person}
                    disabled={pending}
                    onClick={() => choosePerson(p.id)}
                  >
                    <Avatar name={p.name} size="sm" />
                    <span className={styles.personText}>
                      <span className={styles.personName}>{isOrganizerLink || (surface === "desk" && p.id === organizer.id) ? "Organizer" : shortName(p.name)}</span>
                      <span className={styles.personMeta}>
                        {isOrganizerLink ? "Opens the organizer desk" : [p.title, p.organization].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    {checked ? <Icon name="check" className={styles.check} /> : isOrganizerLink ? <Icon name="chevron-right" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {surface === "desk" ? (
            <a className={styles.link} href={participantHref}>
              Open participant screens
            </a>
          ) : null}
        </section>

        <section className={styles.section}>
          <h2 className={`${styles.heading} ag-label-caps`}>Theme</h2>
          <div className={styles.segmented} role="radiogroup" aria-label="Theme">
            {(["system", "light", "dark"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                className={styles.segment}
                disabled={pending}
                onClick={() => run(() => post("/api/theme", { theme: value }))}
              >
                {value === "system" ? "System" : value === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={`${styles.heading} ag-label-caps`}>Demo clock</h2>
          <p className={styles.clockNow}>
            <Icon name="time" size={16} />
            <span>
              {formatDay(demoNow, clock.timeZone)}, {formatTime(demoNow, clock.timeZone)} {clock.city} time
            </span>
          </p>
          <form
            className={styles.clockForm}
            onSubmit={(e) => {
              e.preventDefault();
              run(() => post("/api/demo-clock", { action: "set", date: day, time }));
            }}
          >
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Day</span>
              <select value={day} onChange={(e) => setDay(e.target.value)} className={styles.input}>
                {clock.days.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Time</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={styles.input} step={300} required />
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              Set time
            </Button>
          </form>
          <Button variant="text" size="sm" disabled={pending} onClick={() => run(() => post("/api/demo-clock", { action: "reset" }))}>
            Reset to Sat 11:20
          </Button>
        </section>

        {error ? (
          <p className={styles.error} role="alert">
            <Icon name="alert" size={16} /> {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
