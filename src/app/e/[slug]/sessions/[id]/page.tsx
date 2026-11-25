import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { SaveToggle } from "@/components/SaveToggle";
import { StatusChip } from "@/components/StatusChip";
import { TrackDot } from "@/components/TrackDot";
import { ZoneHint } from "@/components/ZoneHint";
import { requireMember } from "@/lib/auth/current-user";
import { now } from "@/lib/clock";
import { shortName } from "@/lib/text";
import { formatDay, formatTimeRange } from "@/lib/time";
import { getEventBySlug } from "@/server/events";
import { loadProgram, picksFor, recordView } from "@/server/program";
import { toRow, viewerContext } from "@/server/rows";
import styles from "./session.module.css";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const event = getEventBySlug(slug);
  if (!event) return {};
  const session = loadProgram(event).byId.get(id);
  return session ? { title: session.title } : {};
}

const FORMAT: Record<string, string> = { keynote: "Keynote", talk: "Talk", panel: "Panel", workshop: "Workshop" };

/** Session (S05 §05.2): details, Save, why it is picked, abstract, speakers, materials. */
export default async function SessionPage({ params }: Props) {
  const { slug, id } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  const { viewer } = await requireMember(event.id);
  const current = now();
  const program = loadProgram(event);
  const session = program.byId.get(id);
  if (!session) notFound();

  const ctx = viewerContext(event, program, viewer.id, current);
  const { state } = toRow(session, ctx);
  // The reason stays visible after saving: rank as if this session were not saved yet.
  const others = new Set([...ctx.savedIds].filter((sid) => sid !== session.id));
  const asUnsaved = picksFor(event, program, { interests: ctx.interests, savedIds: others, now: current, limit: 50 });
  const pickReason =
    asUnsaved.mode === "interests" ? asUnsaved.picks.find((p) => String(p.sessionId) === session.id)?.reason : undefined;
  recordView(event.id, viewer.id, session.id, current);

  const speakerLine = session.speakers.map((s) => `${shortName(s.name)}, ${s.organization}`).join("; ");

  return (
    <article className={styles.page}>
      <Link href={`/e/${event.slug}/program`} className={styles.back}>
        <Icon name="back" />
        Program
      </Link>

      <p className={`${styles.track} ag-label-caps`}>
        <TrackDot ink={program.inks.get(session.track.id)} />
        {session.track.name} track · {FORMAT[session.format]}
      </p>

      <h1 className={`${styles.title} ${state.canceled ? styles.canceled : ""}`}>{session.title}</h1>

      {state.chips.length ? (
        <div className={styles.chips}>
          {state.chips
            .filter((c) => c !== "picked")
            .map((c) => (
              <StatusChip key={c} status={c} />
            ))}
        </div>
      ) : null}
      {state.messages
        .filter((m) => m.tone !== "accent")
        .map((m) => (
          <p key={m.text} className={`${styles.message} ${styles[m.tone]}`}>
            {m.text}
          </p>
        ))}

      <ul className={styles.meta}>
        <li>
          <Icon name="time" className={styles.metaIcon} />
          <span>
            {state.oldStart ? (
              <s className={styles.old}>
                <span className="ag-sr-only">was </span>
                {state.oldStart}
              </s>
            ) : null}
            {formatDay(session.startsAt, event.timeZone)}, {formatTimeRange(session.startsAt, session.endsAt, event.timeZone)}
            <ZoneHint timeZone={event.timeZone} city={event.city} />
          </span>
        </li>
        <li>
          <Icon name="room" className={styles.metaIcon} />
          <span>
            {session.venue.name}, {session.venue.floor.toLowerCase()}
          </span>
        </li>
        {speakerLine ? (
          <li>
            <Icon name="speaker" className={styles.metaIcon} />
            <span>{speakerLine}</span>
          </li>
        ) : null}
      </ul>

      <div className={styles.actions}>
        <div className={styles.saveSlot}>
          {state.overlaps ? (
            <Link href={`/e/${event.slug}/schedule?resolve=${session.id}`} className={buttonClass({ variant: "secondary", size: "lg", block: true })}>
              Resolve overlap
            </Link>
          ) : (
            <SaveToggle slug={event.slug} sessionId={session.id} title={session.title} state={state.save} size="lg" block />
          )}
        </div>
        <a href={`/api/e/${event.slug}/sessions/${session.id}/ics`} className={buttonClass({ variant: "secondary", size: "lg" })} download>
          <Icon name="calendar-add" />
          Add to calendar
        </a>
      </div>
      <p className={styles.note}>Saving doesn&apos;t reserve a seat. You&apos;ll get updates if anything changes.</p>

      {pickReason && !state.canceled ? (
        <div className={styles.why}>
          <p className={styles.whyTitle}>Why this is picked for you</p>
          <p>{pickReason}</p>
        </div>
      ) : null}

      <p className={styles.abstract}>{session.abstract}</p>

      {session.speakers.length ? (
        <section className={styles.speakers} aria-labelledby="speakers-title">
          <h2 id="speakers-title" className={styles.sectionTitle}>
            {session.speakers.length === 1 ? "Speaker" : "Speakers"}
          </h2>
          <ul className={styles.speakerList}>
            {session.speakers.map((sp) => (
              <li key={sp.id} className={styles.speaker}>
                <p className={styles.speakerName}>{sp.name}</p>
                <p className={styles.muted}>
                  {sp.title}, {sp.organization}
                </p>
                <p className={styles.speakerBio}>{sp.bio}</p>
                <p className={styles.tags}>{sp.tags.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {session.materialsUrl ? (
        <a className={styles.file} href={session.materialsUrl} target="_blank" rel="noreferrer">
          <Icon name="materials" />
          Slides and materials
          <span className={styles.fileHint}>
            Opens the organizer&apos;s page <Icon name="external" size={16} />
          </span>
        </a>
      ) : null}
    </article>
  );
}
