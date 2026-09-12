"use client";

export function ConfirmedActionButton({
  children,
  question,
  className = "admin-button admin-button--danger-quiet",
}: {
  children: React.ReactNode;
  question: string;
  className?: string;
}) {
  return (
    <button
      className={className}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
