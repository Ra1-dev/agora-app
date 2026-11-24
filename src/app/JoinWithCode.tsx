"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";
import { TextField } from "@/components/TextField";

/** "Join with an event code" (any code works in the demo). */
export function JoinWithCode() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { slug?: string; error?: { message?: string } };
      if (!res.ok || !data.slug) {
        setError(data.error?.message ?? "We couldn't join this event. Try again.");
        return;
      }
      setOpen(false);
      router.push(`/e/${data.slug}`);
    });
  };

  return (
    <>
      <Button variant="secondary" size="lg" icon="check-in" block onClick={() => setOpen(true)}>
        Join with an event code
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Join an event"
        description="The code is on your badge or in the invitation from the organizer. In this demo, any code works."
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          style={{ display: "grid", gap: "var(--ag-space-4)" }}
        >
          <TextField
            label="Event code"
            mono
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="For example, STEPPE27"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
          />
          <Button type="submit" variant="primary" size="lg" block disabled={pending}>
            {pending ? "Joining…" : "Join event"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
