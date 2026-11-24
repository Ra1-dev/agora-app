import { Icon } from "@/components/Icon";
import styles from "./page.module.css";

// Scaffold check page. Step 4 replaces it with "My events".
export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.logo}>
        <img className="ag-only-light" src="/brand/agora-logo-ink.svg" alt="AGΩRA" />
        <img className="ag-only-dark" src="/brand/agora-logo-white.svg" alt="AGΩRA" />
      </div>
      <h1 className={styles.title}>Know where to be. Know who to meet.</h1>
      <p className={styles.lead}>The demo is being built. My events appears here next.</p>
      <ul className={styles.checks}>
        <li>
          <Icon name="program" /> Source Sans 3 for text, <span className="ag-label-caps">Hall B</span> in small caps
        </li>
        <li>
          <Icon name="time" /> <span className={styles.time}>11:30–12:15</span> tabular numerals
        </li>
        <li>
          <Icon name="room" /> Event code <span className="ag-mono">STEPPE27</span>
        </li>
      </ul>
      <button type="button" className={styles.primary}>
        <Icon name="add" /> Join with an event code
      </button>
    </main>
  );
}
