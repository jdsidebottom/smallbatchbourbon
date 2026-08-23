"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/app/admin/bottles/actions";

const inputBase =
  "mt-2 w-full rounded-lg border border-ink-line bg-ink-card px-3 py-2.5 text-[16px] text-cream placeholder:text-cream-muted focus:border-amber disabled:opacity-60";

export function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-xs font-semibold tracking-[0.14em] text-cream-muted uppercase">
        {children}
      </span>
      {hint && <span className="mt-1 block text-xs text-cream-muted normal-case">{hint}</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-verdict-walk">
      {message}
    </p>
  );
}

export function TextField({
  name,
  label,
  hint,
  error,
  defaultValue,
  type = "text",
  placeholder,
  required,
  step,
  inputMode,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  return (
    <div>
      <Label htmlFor={name} hint={hint}>
        {label}
      </Label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        inputMode={inputMode}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error)}
        className={inputBase}
      />
      <FieldError message={error} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  hint,
  error,
  defaultValue,
  rows = 4,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <div>
      <Label htmlFor={name} hint={hint}>
        {label}
      </Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error)}
        className={`${inputBase} leading-relaxed`}
      />
      <FieldError message={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  error,
  defaultValue,
  options,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} hint={hint}>
        {label}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error)}
        className={inputBase}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 shrink-0 rounded border-ink-line bg-ink-card accent-[var(--color-amber)]"
      />
      <label htmlFor={name} className="text-sm text-cream-dim">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-cream-muted">{hint}</span>}
      </label>
    </div>
  );
}

export function SubmitButton({ children = "Save" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-full bg-amber px-6 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow disabled:opacity-70"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

/**
 * A form section bound to one server action, with its own result banner.
 * Sections save independently so a long bottle record never has to be filled in
 * one sitting.
 */
export function ActionSection({
  title,
  description,
  action,
  submitLabel,
  children,
}: {
  title: string;
  description?: string;
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  children: (fieldErrors: Record<string, string>) => React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
      <h2 className="font-display text-xl text-cream">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-cream-muted">{description}</p>}

      <form action={formAction} className="mt-6 space-y-5">
        {children(state && !state.ok ? (state.fieldErrors ?? {}) : {})}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <SubmitButton>{submitLabel}</SubmitButton>
          {state && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${state.ok ? "text-verdict-steal" : "text-verdict-walk"}`}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
