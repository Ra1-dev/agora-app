import Link from "next/link";
import { ViewingAs } from "./ViewingAs";
import styles from "./ShellHeader.module.css";

/** AGORA's own header: only in the shell (My events), never inside event screens. */
export function ShellHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo} aria-label="AGΩRA, my events">
        <img className="ag-only-light" src="/brand/agora-logo-ink.svg" alt="" />
        <img className="ag-only-dark" src="/brand/agora-logo-white.svg" alt="" />
      </Link>
      <ViewingAs surface="participant" />
    </header>
  );
}
