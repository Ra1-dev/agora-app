"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { plural } from "@/lib/text";
import styles from "./sessions.module.css";

type Props = {
  slug: string;
  session: { id: string; title: string; date: string; start: string; end: string; venueId: string; saves: number };
  days: { value: string; label: string }[];
  venues: { value: string; label: string }[];
};

type Errors = Partial<Record<"date" | "start" | "end" | "venueId" | "form", string>>;

/** Edit time and room (UC-05) or cancel a session (FR-06). Saving notifies everyone who saved it. */
export function SessionEditor({ slug, session, days, venues }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [form, setForm] = useState({ date: session.date, start: session.start, end: session.end, venueId: session.venueId });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setForm({ date: session.date, start: session.start, end: session.end, venueId: session.venueId });
    setErrors({});
    setConfirmCancel(false);
  };

  const save = () => {
    setErrors({});
    startTransition(async () => {
      const res = await fetch(`/api/desk/${slug}/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { notified?: number; message?: string; error?: { message?: string; field?: keyof Errors } };
      if (!res.ok) {
        setErrors({ [data.error?.field ?? "form"]: data.error?.message ?? "We couldn't save this. Try again." });
        return;
      }
      setOpen(false);
      router.refresh();
      toast({ message: `Saved. ${plural(data.notified ?? 0, "person", "people")} who saved it got: “${data.message}”` });
    });
  };

  const cancel = () => {
    startTransition(async () => {
      const res = await fetch(`/api/desk/${slug}/sessions/${session.id}/cancel`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { notified?: number; error?: { message?: string } };
      if (!res.ok) {
        setErrors({ form: data.error?.message ?? "We couldn't cancel this session. Try again." });
        return;
      }
      setOpen(false);
      router.refresh();
      toast({ message: `Canceled ${session.title}. ${plural(data.notified ?? 0, "person", "people")} who saved it were told.` });
    });
  };

  const field = (key: keyof Errors) =>
    errors[key] ? (
      <p className={styles.error} role="alert" id={`${session.id}-${key}-error`}>
        <Icon name="alert" size={16} />
        {errors[key]}
      </p>
    ) : null;

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        icon="edit"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        Edit<span className="ag-sr-only"> {session.title}</span>
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={confirmCancel ? "Cancel this session?" : "Change time or room"}
        description={
          confirmCancel
            ? `${session.title} stays in ${plural(session.saves, "schedule")}, marked as canceled. Everyone who saved it gets a notification.`
            : `${session.title}. ${plural(session.saves, "person", "people")} saved it and will be notified.`
        }
      >
        {confirmCancel ? (
          <div className={styles.form}>
            {field("form")}
            <Button variant="danger" size="lg" block disabled={pending} onClick={cancel}>
              {pending ? "Canceling…" : "Cancel session"}
            </Button>
            <Button variant="text" onClick={() => setConfirmCancel(false)} className={styles.center}>
              Keep it
            </Button>
          </div>
        ) : (
          <form
            className={styles.form}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className={styles.grid}>
              <label className={`${styles.field} ${styles.full}`}>
                <span className={styles.fieldLabel}>Day</span>
                <select className={styles.input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-invalid={errors.date ? true : undefined}>
                  {days.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                {field("date")}
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Starts</span>
                <input type="time" step={300} className={styles.input} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} aria-invalid={errors.start ? true : undefined} />
                {field("start")}
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ends</span>
                <input type="time" step={300} className={styles.input} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} aria-invalid={errors.end ? true : undefined} />
                {field("end")}
              </label>
              <label className={`${styles.field} ${styles.full}`}>
                <span className={styles.fieldLabel}>Room</span>
                <select className={styles.input} value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} aria-invalid={errors.venueId ? true : undefined}>
                  {venues.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
                {field("venueId")}
              </label>
            </div>
            <p className={styles.hint}>Times are in the event&apos;s time zone, 24-hour.</p>
            {field("form")}
            <Button type="submit" variant="primary" size="lg" block disabled={pending}>
              {pending ? "Saving…" : "Save and notify"}
            </Button>
            <Button variant="danger" size="md" onClick={() => setConfirmCancel(true)} className={styles.center}>
              Cancel this session
            </Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
