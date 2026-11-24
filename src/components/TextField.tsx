import { useId, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import styles from "./TextField.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
  mono?: boolean;
};

/** Text field (S12 §12.2): label above, hint below, errors with an icon and words, not colour alone. */
export function TextField({ label, hint, error, mono, className, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${mono ? styles.mono : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? hintId : undefined}
        {...rest}
      />
      {error ? (
        <p id={hintId} className={styles.error} role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
