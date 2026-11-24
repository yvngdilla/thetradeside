"use client";

/** Opens the browser's print window, where a designer prints the list or saves it as a PDF. */
export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
