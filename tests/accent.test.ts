import { describe, expect, it } from "vitest";
import { accentCss, deriveAccent, MIN_CONTRAST, pickOnAccent } from "@/lib/brand/accent";
import { contrastRatio, deltaE76, hsvSaturation } from "@/lib/brand/color";

describe("colour maths", () => {
  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#5B3DF5", "#FFFFFF")).toBeCloseTo(6.12, 2);
  });

  it("computes HSV saturation and CIE76", () => {
    expect(hsvSaturation("#808080")).toBe(0);
    expect(hsvSaturation("#FF0000")).toBe(1);
    expect(deltaE76("#3255A4", "#3255A4")).toBe(0);
    expect(deltaE76("#000000", "#FFFFFF")).toBeCloseTo(100, 0);
  });
});

describe("deriveAccent", () => {
  it("keeps the STEPPE organizer colour in light theme (already 6.1:1 on white)", () => {
    const d = deriveAccent("#5B3DF5");
    expect(d.monochrome).toBe(false);
    expect(d.light).toEqual({ accent: "#5B3DF5", onAccent: "#FFFFFF" });
  });

  it("lightens toward white in dark theme until 4.5:1 on #1B1A18, with dark text on it", () => {
    const d = deriveAccent("#5B3DF5");
    expect(d.dark.accent).not.toBe("#5B3DF5");
    expect(contrastRatio(d.dark.accent, "#1B1A18")).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(d.dark.onAccent).toBe("#111110");
  });

  it("darkens a light organizer colour for light theme, stopping at the first passing step", () => {
    const d = deriveAccent("#FFD400");
    const ratio = contrastRatio(d.light.accent, "#FFFFFF");
    expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(ratio).toBeLessThan(MIN_CONTRAST + 0.2);
    // Already readable on the dark surface: unchanged.
    expect(d.dark.accent).toBe("#FFD400");
  });

  it("meets 4.5:1 in both themes for any saturated colour", () => {
    for (const hex of ["#E63946", "#00A95C", "#FF48B0", "#0047FF", "#7A00FF", "#00C2C7", "#FF8800"]) {
      const d = deriveAccent(hex);
      expect(contrastRatio(d.light.accent, "#FFFFFF")).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrastRatio(d.dark.accent, "#1B1A18")).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrastRatio(d.light.accent, d.light.onAccent)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrastRatio(d.dark.accent, d.dark.onAccent)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it("uses ink for a monochrome organizer (saturation < 0.12) and asks for underlined links", () => {
    for (const hex of ["#808080", "#0A0A0A", "#F5F5F0", "#6B6E70"]) {
      const d = deriveAccent(hex);
      expect(d.monochrome).toBe(true);
      expect(d.light.accent).toBe("#151618");
      expect(d.dark.accent).toBe("#F0EDE6");
    }
    expect(accentCss(deriveAccent("#808080"))).toContain("text-decoration:underline");
  });

  it("treats saturation exactly at the threshold as colour", () => {
    // #FFE0E0: saturation 0.1216 -> not monochrome
    expect(hsvSaturation("#FFE0E0")).toBeGreaterThanOrEqual(0.12);
    expect(deriveAccent("#FFE0E0").monochrome).toBe(false);
  });

  it("picks white or #111110 for text on the accent, whichever contrasts more", () => {
    expect(pickOnAccent("#151618")).toBe("#FFFFFF");
    expect(pickOnAccent("#F0EDE6")).toBe("#111110");
  });

  it("accepts short hex and lowercase", () => {
    expect(deriveAccent("#5b3df5").light.accent).toBe("#5B3DF5");
    expect(deriveAccent("#888").monochrome).toBe(true);
  });

  it("emits CSS that overrides only the accent pair, for every theme selector", () => {
    const css = accentCss(deriveAccent("#5B3DF5"));
    const props = [...css.matchAll(/(--[a-z-]+):/g)].map((m) => m[1]);
    expect(new Set(props)).toEqual(new Set(["--ag-color-accent", "--ag-color-on-accent"]));
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).not.toContain("underline");
  });
});
