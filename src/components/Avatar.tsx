import { initials } from "@/lib/text";
import styles from "./Avatar.module.css";

type AvatarProps = { name: string; size?: "sm" | "md" | "lg" | "xl" };

/** Initials avatar (avatars are round, S11). No photos in the demo. */
export function Avatar({ name, size = "md" }: AvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
