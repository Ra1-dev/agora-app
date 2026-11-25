"use client";

import { useId } from "react";
import styles from "./Switch.module.css";

type Props = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** On/off row (S12 §12.2 "Privacy"): label, a plain-words description, and a switch. */
export function Switch({ label, description, checked, onChange, disabled }: Props) {
  const id = useId();
  return (
    <div className={styles.row}>
      <span className={styles.text}>
        <span id={`${id}-label`} className={styles.label}>
          {label}
        </span>
        <span id={`${id}-desc`} className={styles.description}>
          {description}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        className={styles.switch}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
}
