import { Fragment, type ReactNode } from "react";

/** Project Gutenberg marks italics as _word_; show them as real italics. */
export function withEmphasis(text: string): ReactNode {
  const parts = text.split(/(_[^_\n]+_)/g);
  return parts.map((part, i) =>
    /^_[^_\n]+_$/.test(part) ? <em key={i}>{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>,
  );
}
