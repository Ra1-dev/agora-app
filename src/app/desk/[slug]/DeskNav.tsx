"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/icon-names";
import styles from "./desk.module.css";

/** Organizer desk navigation (S12 §12.9): icons always with labels. */
export function DeskNav({ slug }: { slug: string }) {
  const path = usePathname();
  const base = `/desk/${slug}`;
  const items: { href: string; label: string; icon: IconName; current: boolean }[] = [
    { href: base, label: "Overview", icon: "dashboard", current: path === base },
    { href: `${base}/sessions`, label: "Sessions", icon: "program", current: path.startsWith(`${base}/sessions`) },
    { href: `${base}/announcements`, label: "Announcements", icon: "announcement", current: path.startsWith(`${base}/announcements`) },
    { href: `${base}/tracks`, label: "Tracks & rooms", icon: "track", current: path.startsWith(`${base}/tracks`) },
  ];
  return (
    <nav className={styles.nav} aria-label="Organizer desk">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={styles.navItem} aria-current={item.current ? "page" : undefined}>
          <Icon name={item.icon} size={18} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
