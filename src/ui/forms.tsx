"use client";
import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Accessible form pieces shared by the dialogs (B15/B16). A field error is attached to its field
 * (aria-invalid + aria-describedby), so a screen reader reads it with the label when focus
 * lands there; a form-level problem is a focused alert. Nothing here keeps state of its own.
 */

export type Errors = Record<string, string>;

export function errorId(id: string) {
  return `${id}-error`;
}

/** Props for an input/select that may carry an error. */
export function fieldProps(id: string, errors: Errors, describedBy?: string) {
  const err = errors[id];
  const ids = [describedBy, err ? errorId(id) : null].filter(Boolean).join(" ");
  return { id, "aria-invalid": err ? (true as const) : undefined, "aria-describedby": ids || undefined };
}

export function FieldError({ id, errors }: { id: string; errors: Errors }) {
  if (!errors[id]) return null;
  return (
    <span className="field-error" id={errorId(id)}>
      {errors[id]}
    </span>
  );
}

/** After a failed submit: focus the first invalid field (document order) so its error is read. */
export function focusFirstInvalid(root: HTMLElement | null, errors: Errors): boolean {
  if (!root) return false;
  const first = [...root.querySelectorAll<HTMLElement>("[id]")].find((el) => errors[el.id] && (el.matches("input, select, textarea, button, fieldset, [tabindex]")));
  if (first) {
    (first.matches("fieldset") ? first.querySelector<HTMLElement>("input:not([disabled]), select, button") ?? first : first).focus();
    return true;
  }
  return false;
}

/** A form-level message: an alert that takes focus when it appears (and when it changes). */
export function FormAlert({ message, testId }: { message: string | null; testId?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <p role="alert" className="warnbox" tabIndex={-1} ref={ref} data-testid={testId}>
      {message}
    </p>
  );
}

export const isDecimal = (s: string) => /^\d+(\.\d+)?$/.test(s.trim());
export const isWhole = (s: string, min: number, max: number) => /^\d+$/.test(s.trim()) && Number(s) >= min && Number(s) <= max;
