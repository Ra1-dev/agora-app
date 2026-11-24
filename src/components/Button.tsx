import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./icon-names";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "text" | "danger";
type Size = "lg" | "md" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Icons always come with a text label (S13). */
  icon?: IconName;
  block?: boolean;
  className?: string;
  children: ReactNode;
};

export function buttonClass({ variant = "secondary", size = "md", block, className }: Omit<CommonProps, "children" | "icon">) {
  return [styles.button, styles[variant], styles[size], block ? styles.block : "", className ?? ""].filter(Boolean).join(" ");
}

export function Button({
  variant,
  size,
  icon,
  block,
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon ? <Icon name={icon} size={size === "sm" ? 16 : 20} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, icon, block, className, children }: CommonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, block, className })}>
      {icon ? <Icon name={icon} size={size === "sm" ? 16 : 20} /> : null}
      {children}
    </Link>
  );
}
