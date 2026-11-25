"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Switch } from "@/components/Switch";
import { TextField } from "@/components/TextField";
import { useToast } from "@/components/Toast";
import { LIMITS, parseList, type FieldErrors, type ProfileInput } from "@/lib/people/profile-input";
import { privacySummary, type ProfileField } from "@/lib/people/visibility";
import styles from "./profile.module.css";

type Props = { slug: string; initial: ProfileInput; allInterests: string[] };

const VISIBILITY_ROWS: { field: ProfileField; label: string }[] = [
  { field: "organization", label: "Show my organization" },
  { field: "title", label: "Show my role" },
  { field: "interests", label: "Show my interests" },
  { field: "bio", label: "Show my bio" },
  { field: "skills", label: "Show my skills" },
];

/** Profile (UC-01, FR-08, FR-09): fields, interests, networking and per-field visibility. */
export function ProfileForm({ slug, initial, allInterests }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [skillsText, setSkillsText] = useState(initial.skills.join(", "));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleInterest = (label: string) =>
    set("interests", form.interests.includes(label) ? form.interests.filter((i) => i !== label) : [...form.interests, label]);

  const save = () => {
    setErrors({});
    startTransition(async () => {
      const res = await fetch(`/api/e/${slug}/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, skills: parseList(skillsText) }),
      });
      const data = (await res.json().catch(() => ({}))) as { errors?: FieldErrors; error?: { message?: string } };
      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
          toast({ message: "Check the marked fields.", tone: "error" });
        } else toast({ message: data.error?.message ?? "We couldn't save your profile. Try again.", tone: "error" });
        return;
      }
      router.refresh();
      toast({ message: "Profile saved. Picks and People use it right away." });
    });
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className={styles.section} aria-labelledby="about-you">
        <h2 id="about-you" className={styles.sectionTitle}>
          About you
        </h2>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
          hint="Never shown to other participants."
        />
        <TextField
          label="Organization"
          value={form.organization}
          maxLength={LIMITS.organization + 20}
          onChange={(e) => set("organization", e.target.value)}
          error={errors.organization}
        />
        <TextField label="Role" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} />
        <div className={styles.field}>
          <label htmlFor="bio" className={styles.label}>
            Bio
          </label>
          <textarea
            id="bio"
            className={styles.textarea}
            rows={4}
            value={form.bio}
            aria-invalid={errors.bio ? true : undefined}
            aria-describedby="bio-hint"
            onChange={(e) => set("bio", e.target.value)}
          />
          {errors.bio ? (
            <p id="bio-hint" className={styles.error} role="alert">
              <Icon name="alert" size={16} />
              {errors.bio}
            </p>
          ) : (
            <p id="bio-hint" className={styles.hint}>
              {form.bio.length} of {LIMITS.bio} characters.
            </p>
          )}
        </div>
        <TextField
          label="Skills"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          error={errors.skills}
          hint="Separate skills with commas."
        />
      </section>

      <section className={styles.section} aria-labelledby="interests-title">
        <h2 id="interests-title" className={styles.sectionTitle}>
          Interests
        </h2>
        <p className={styles.hint}>Picks and people suggestions are built from these. Pick up to {LIMITS.interests}.</p>
        <fieldset className={styles.interests} aria-describedby={errors.interests ? "interests-error" : undefined}>
          <legend className="ag-sr-only">Your interests</legend>
          {allInterests.map((label) => {
            const on = form.interests.includes(label);
            return (
              <label key={label} className={`${styles.interest} ${on ? styles.interestOn : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggleInterest(label)} className={styles.checkbox} />
                {label}
              </label>
            );
          })}
        </fieldset>
        {errors.interests ? (
          <p id="interests-error" className={styles.error} role="alert">
            <Icon name="alert" size={16} />
            {errors.interests}
          </p>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="privacy-title">
        <h2 id="privacy-title" className={styles.sectionTitle}>
          Privacy
        </h2>
        <div>
          <Switch
            label="Open to networking"
            description={
              form.networkingOptIn ? "Others can find you in People and send requests." : "Off. You won't appear in suggestions or get requests."
            }
            checked={form.networkingOptIn}
            onChange={(v) => set("networkingOptIn", v)}
          />
          {VISIBILITY_ROWS.map((row) => (
            <Switch
              key={row.field}
              label={row.label}
              description={form.visibility[row.field] ? "Visible to people at this event." : "Hidden. Only you can see it."}
              checked={form.visibility[row.field]}
              onChange={(v) => set("visibility", { ...form.visibility, [row.field]: v })}
            />
          ))}
        </div>
        <p className={styles.summary}>
          <Icon name="visible" size={16} />
          {privacySummary(form.visibility).replace(" Change this in Profile.", "")}
        </p>
      </section>

      <div className={styles.saveBar}>
        <Button type="submit" variant="primary" size="lg" block disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
