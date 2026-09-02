"use client";

export function PrintButton(): React.ReactNode {
  return <button onClick={() => window.print()}>Print timetable</button>;
}
