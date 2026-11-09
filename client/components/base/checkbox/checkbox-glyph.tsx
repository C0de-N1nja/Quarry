import { cx } from "@/utils/cx";

export type CheckboxSize = "sm" | "md";

export const checkboxSizes: Record<
  CheckboxSize,
  { box: string; glyph: string; label: string; gap: string }
> = {
  md: { box: "size-4", glyph: "size-4", label: "text-body-medium", gap: "gap-2" },
  sm: { box: "size-3.5", glyph: "size-3.5", label: "text-body-2-medium", gap: "gap-1.5" },
};

export interface CheckboxGlyphState {
  isSelected: boolean;
  isIndeterminate: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isHovered: boolean;
}

/**
 * The 16px (or 14px) checkbox box + tick/indeterminate glyph. Shared by the
 * standalone Checkbox and the CheckboxCard so their visuals stay identical.
 */
export function CheckboxGlyph({
  state,
  size = "md",
}: {
  state: CheckboxGlyphState;
  size?: CheckboxSize;
}) {
  const { isSelected, isIndeterminate, isFocusVisible, isDisabled, isHovered } = state;
  const s = checkboxSizes[size];
  const isMarked = isSelected || isIndeterminate;
  const hover = isHovered && !isDisabled;

  return (
    <span
      aria-hidden
      className={cx(
        "flex shrink-0 items-center justify-center rounded-sm",
        "transition-[background-color,border-color,box-shadow] duration-150 ease",
        s.box,
        isMarked
          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-white shadow-xs"
          : cx(
              "border bg-background-primary-default shadow-xs",
              hover ? "border-slate-400 dark:border-slate-500" : "border-slate-300 dark:border-slate-700",
            ),
        isDisabled && "opacity-50",
        isFocusVisible && "ring-2 ring-border-focus-ring ring-offset-2",
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className={s.glyph}>
        {isIndeterminate ? (
          <path d="M4.5 8H8H11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : isSelected ? (
          <path
            d="M4 7.7002L6.64645 10.3466C6.84171 10.5419 7.15829 10.5419 7.35355 10.3466L12 5.7002"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="animate-check-draw"
          />
        ) : null}
      </svg>
    </span>
  );
}
