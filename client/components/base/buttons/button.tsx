import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
  Ref,
} from "react";
import { cx, sortCx } from "@/utils/cx";
import { directionalIconClass } from "@/utils/directional-icon";

/**
 * Figma source: Board UI → Buttons (node 3656:13819).
 *
 * Variant matrix from Figma:
 *   Type     = Primary | Secondary | Ghost | Danger
 *   Size     = Medium  | Small | Xs
 *   State    = Default | Hover | Active | Disabled        (CSS pseudo)
 *   OnlyIcon = false   | true
 *
 * Sizing (1:1 with Figma):
 *
 *                       Medium                    Small                     Xs
 *   container          h=36, p=8,   r=10         h=32, px=8 py=6, r=8      h=24, px=8, r=4
 *   gap                 2px                       2px                      1.33px→1
 *   icon                20×20                     18×18                    14×14
 *   label wrapper       px=4                      px=2                     px=2
 *   text style          Body 1/Medium             Body 1/Medium            Caption 1/Semibold
 *   icon-only square    36×36 (content-derived)   32×32 (forced size)      24×24 (forced size)
 *
 * `xs` is the smallest tier — first needed for the calendar template's
 * event-details modal ("Join" / edit-icon buttons, node 3920:10954), which
 * scales every dimension down by the same ~0.667 factor from Figma; the
 * table above rounds those to clean pixel values rather than reproducing
 * the fractional source numbers.
 *
 * Icons are rendered by the component itself via the `leadingIcon` /
 * `trailingIcon` props so the consumer can't pass the wrong size. Pass
 * a Remix Icon component reference (`RiAddLine`, not `<RiAddLine />`).
 *
 * For icon-only buttons:
 *   <Button iconOnly leadingIcon={RiAddLine} aria-label="Add" />
 *
 * The HTML `type` prop is preserved; Figma's "Type" enum is renamed to
 * `variant` to avoid the clash.
 */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "whatsapp"
  | "whatsapp-subtle"
  | "facebook"
  | "facebook-subtle"
  | "linkedin"
  | "linkedin-subtle"
  | "instagram"
  | "instagram-subtle"
  | "twitter"
  | "twitter-subtle"
  | "google"
  | "google-subtle"
  | "phone";
type ButtonSize = "medium" | "small" | "xs" | "md" | "sm";
type ResolvedButtonSize = "medium" | "small" | "xs";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

const styles = sortCx({
  base: [
    "inline-flex items-center justify-center gap-0.5 whitespace-nowrap overflow-hidden",
    "font-sans select-none cursor-pointer",
    "button-press-motion",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
  ].join(" "),

  // Base shape per size (used when label is present OR medium icon-only).
  size: {
    medium: "h-9 rounded-2lg p-2 text-body-medium",
    small:  "h-8 rounded-lg px-2 py-1.5 text-body-medium",
    xs:     "h-6 rounded-sm px-2 text-caption-1-semibold",
  },

  // Icon-only override:
  //   Medium → keep p-2; w expands from content (8+20+8 = 36) → square.
  //   Small  → Figma forces 32×32 even though 8+18+8=34, so we hard-set size-8
  //            and zero the padding; the inner flex centers the 18px icon.
  //   Xs     → forces 24×24, content-centered — used for the calendar
  //            template's edit-icon buttons (timezone/participants/reminder).
  iconOnlySize: {
    medium: "",                // base size already produces 36×36 with a 20px icon
    small:  "size-8 p-0",      // hard 32×32, content-centered
    xs:     "size-6 p-0",      // hard 24×24, content-centered
  },

  icon: {
    medium: "size-5 shrink-0",        // 20px
    small:  "size-[18px] shrink-0",   // 18px
    xs:     "size-3.5 shrink-0",      // 14px
  },

  label: {
    medium: "inline-flex items-center justify-center px-1 shrink-0",    // px=4
    small:  "inline-flex items-center justify-center px-0.5 shrink-0",  // px=2
    xs:     "inline-flex items-center justify-center px-0.5 shrink-0",  // px=2
  },

  variant: {
    primary: [
      "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:active:bg-slate-200",
      "border border-slate-800/80 dark:border-white/20 shadow-xs font-semibold",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    danger: [
      "bg-button-danger text-text-white shadow-xs",
      "disabled:text-foreground-disabled-danger disabled:shadow-none",
      "aria-disabled:text-foreground-disabled-danger aria-disabled:shadow-none",
    ].join(" "),
    secondary: [
      "bg-background-primary-default text-text-primary",
      "border border-border-button-default shadow-xs",
      "hover:bg-background-primary-hover  hover:border-border-button-hover",
      "active:bg-background-primary-active active:border-border-button-active",
      "disabled:bg-background-primary-disabled disabled:border-border-button-default disabled:text-text-tertiary disabled:shadow-none",
      "aria-disabled:bg-background-primary-disabled aria-disabled:border-border-button-default aria-disabled:text-text-tertiary aria-disabled:shadow-none",
    ].join(" "),
    ghost: [
      "bg-button-ghost-background text-button-ghost-foreground",
      "hover:bg-button-ghost-hover active:bg-button-ghost-active",
      "disabled:bg-button-ghost-disabled disabled:text-button-ghost-disabled-foreground disabled:shadow-none",
      "aria-disabled:bg-button-ghost-disabled aria-disabled:text-button-ghost-disabled-foreground aria-disabled:shadow-none",
    ].join(" "),
    whatsapp: [
      "bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da850] text-white shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    "whatsapp-subtle": [
      "bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 shadow-xs",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    facebook: [
      "bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1465d2] text-white shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    "facebook-subtle": [
      "bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/25 text-blue-500 border border-blue-500/30 shadow-xs",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    linkedin: [
      "bg-[#0A66C2] hover:bg-[#095196] active:bg-[#08447d] text-white shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    "linkedin-subtle": [
      "bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/25 text-sky-500 border border-sky-500/30 shadow-xs",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    instagram: [
      "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:opacity-95 active:opacity-90 text-white shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    "instagram-subtle": [
      "bg-pink-500/10 hover:bg-pink-500/20 active:bg-pink-500/25 text-pink-500 border border-pink-500/30 shadow-xs",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    twitter: [
      "bg-black dark:bg-[#18181b] hover:bg-neutral-800 dark:hover:bg-[#27272a] text-white border border-neutral-700/60 shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    "twitter-subtle": [
      "bg-neutral-500/10 hover:bg-neutral-500/20 active:bg-neutral-500/25 text-neutral-300 border border-neutral-500/30 shadow-xs",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    google: [
      "bg-[#4285F4] hover:bg-[#3367d6] active:bg-[#2a56c6] text-white shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    "google-subtle": [
      "bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/25 text-rose-500 border border-rose-500/30 shadow-xs",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
    phone: [
      "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs font-medium",
      "disabled:opacity-50 disabled:shadow-none aria-disabled:opacity-50 aria-disabled:shadow-none",
    ].join(" "),
  },
});

export function Button({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  const resolvedSize: ResolvedButtonSize = size === "sm" ? "small" : size === "md" ? "medium" : size;

  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        styles.base,
        styles.size[resolvedSize],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[resolvedSize],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cx(styles.icon[resolvedSize], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[resolvedSize]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cx(styles.icon[resolvedSize], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </button>
  );
}

/** Anchor counterpart to Button for navigational actions. */
export function ButtonLink({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  ref,
  ...props
}: ButtonLinkProps) {
  const resolvedSize: ResolvedButtonSize = size === "sm" ? "small" : size === "md" ? "medium" : size;

  return (
    <a
      ref={ref}
      className={cx(
        styles.base,
        styles.size[resolvedSize],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[resolvedSize],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cx(styles.icon[resolvedSize], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[resolvedSize]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cx(styles.icon[resolvedSize], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </a>
  );
}

/** Style maps, exported for advanced composition and the dev Design Tuner. */
export const buttonStyles = styles;
