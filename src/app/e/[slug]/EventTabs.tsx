"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/icon-names";
import styles from "./event.module.css";

type Tab = { href: string; label: string; icon: IconName; match: (path: string) => boolean };

/** Participant tabs (design-decisions §8): Program, My schedule, People, Inbox. Icons always with labels. */
export function EventTabs({ slug, unread }: { slug: string; unread: number }) {
  const path = usePathname();
  const base = `/e/${slug}`;
  const tabs: Tab[] = [
    {
      href: `${base}/program`,
      label: "Program",
      icon: "program",
      match: (p) => p === base || p.startsWith(`${base}/program`) || p.startsWith(`${base}/sessions`) || p.startsWith(`${base}/about`),
    },
    { href: `${base}/schedule`, label: "My schedule", icon: "schedule", match: (p) => p.startsWith(`${base}/schedule`) },
    {
      href: `${base}/people`,
      label: "People",
      icon: "people",
      match: (p) => p.startsWith(`${base}/people`) || p.startsWith(`${base}/messages`) || p.startsWith(`${base}/profile`),
    },
    { href: `${base}/inbox`, label: "Inbox", icon: "inbox", match: (p) => p.startsWith(`${base}/inbox`) },
  ];

  return (
    <nav className={styles.tabs} aria-label="Event">
      {tabs.map((tab) => {
        const current = tab.match(path);
        const badge = tab.label === "Inbox" && unread > 0 ? (unread > 99 ? "99+" : String(unread)) : null;
        return (
          <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={current ? "page" : undefined}>
            <Icon name={tab.icon} size={22} />
            <span>
              {tab.label}
              {badge ? <span className="ag-sr-only">, {badge} unread</span> : null}
            </span>
            {badge ? (
              <span className={styles.badge} data-badge="inbox" aria-hidden="true">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
