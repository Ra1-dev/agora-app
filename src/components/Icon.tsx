import type { IconName } from "./icon-names";

type IconProps = {
  name: IconName;
  /** Pixel size; defaults to the token --ag-size-icon-md (20px). */
  size?: number;
  className?: string;
  /** Icons are decorative by default: nav items and buttons always carry a text label. */
  title?: string;
};

/** Renders a symbol from the AGORA sprite, which IconSprite inlines once per page. */
export function Icon({ name, size = 20, className, title }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <use href={`#ag-${name}`} />
    </svg>
  );
}
