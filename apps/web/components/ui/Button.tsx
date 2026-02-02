"use client";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "bg-white text-slate-900 border hover:bg-slate-50";
  return (
    <button
      {...props}
      className={cx(
        "rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed",
        styles,
        props.className
      )}
    >
      {children}
    </button>
  );
}
