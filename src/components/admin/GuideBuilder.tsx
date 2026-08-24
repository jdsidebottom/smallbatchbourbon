"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { ActionResult } from "@/app/admin/bottles/actions";
import { ActionSection, SelectField, TextArea, TextField, SubmitButton } from "@/components/admin/fields";
import { TOP_PICK_COUNT } from "@/lib/domain/article";
import type { GuideItemRow } from "@/lib/data/articles";

type BottleOption = { id: string; name: string; status: string; brand: string | null };

/**
 * The buying-guide builder (PRD §13.3).
 *
 * An editor selects canonical bottle records and gives each one a guide-specific
 * label and rationale. There is deliberately no field here for proof, price or
 * verdict: those render from the bottle record at request time, which is what
 * keeps a guide correct when a bottle is corrected.
 */
export function GuideBuilder({
  items,
  bottles,
  addItem,
  updateItem,
  deleteItem,
  moveItem,
}: {
  items: GuideItemRow[];
  bottles: BottleOption[];
  addItem: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  updateItem: (itemId: string, prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  deleteItem: (itemId: string) => Promise<ActionResult>;
  moveItem: (itemId: string, direction: "up" | "down") => Promise<ActionResult>;
}) {
  const used = new Set(items.map((item) => item.bottle_id));
  const available = bottles.filter((bottle) => !used.has(bottle.id));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-ink-line bg-ink-raised p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-cream">Picks</h2>
          <span className="text-sm text-cream-muted">
            {items.length} bottle{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-cream-muted">
          Ordered top to bottom. The first {TOP_PICK_COUNT} render above the fold as top picks.
        </p>

        {items.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-ink-line p-8 text-center text-sm text-cream-muted">
            No picks yet. Add the first bottle below.
          </p>
        ) : (
          <ol className="mt-6 space-y-3">
            {items.map((item, index) => (
              <PickRow
                key={item.id}
                item={item}
                index={index}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                updateItem={updateItem}
                deleteItem={deleteItem}
                moveItem={moveItem}
              />
            ))}
          </ol>
        )}
      </section>

      <ActionSection
        title="Add a pick"
        description="Only bottles not already in this guide are listed."
        action={addItem}
        submitLabel="Add pick"
      >
        {(errors) =>
          available.length === 0 ? (
            <p className="text-sm text-cream-muted">
              Every bottle in the database is already in this guide.
            </p>
          ) : (
            <>
              <SelectField
                name="bottleId"
                label="Bottle"
                placeholder="Choose a bottle…"
                error={errors.bottleId}
                options={available.map((bottle) => ({
                  value: bottle.id,
                  label: `${bottle.brand ? `${bottle.brand} — ` : ""}${bottle.name}${
                    bottle.status === "published" ? "" : ` (${bottle.status})`
                  }`,
                }))}
              />
              <TextField
                name="label"
                label="Label"
                defaultValue=""
                error={errors.label}
                placeholder="Best overall"
                hint="Optional badge, e.g. Best Overall, Best Value, Best for Beginners."
              />
              <TextArea
                name="rationale"
                label="Why it earned the spot"
                rows={3}
                defaultValue=""
                error={errors.rationale}
                hint="Guide-specific reasoning. Required before the guide can be published."
              />
            </>
          )
        }
      </ActionSection>
    </div>
  );
}

function PickRow({
  item,
  index,
  isFirst,
  isLast,
  updateItem,
  deleteItem,
  moveItem,
}: {
  item: GuideItemRow;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  updateItem: (itemId: string, prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  deleteItem: (itemId: string) => Promise<ActionResult>;
  moveItem: (itemId: string, direction: "up" | "down") => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const [state, formAction] = useActionState(updateItem.bind(null, item.id), null);

  const isTopPick = index < TOP_PICK_COUNT;
  const unpublished = item.bottle?.status !== "published";

  const run = (work: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await work();
      setRowError(result.ok ? null : result.message);
    });

  return (
    <li className="rounded-xl border border-ink-line bg-ink-card p-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            isTopPick ? "bg-amber text-ink" : "border border-ink-line text-cream-muted"
          }`}
          aria-hidden="true"
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-cream">
            <span className="sr-only">Pick {index + 1}: </span>
            {item.bottle?.name ?? "Bottle no longer exists"}
            {item.label && (
              <span className="ml-2 rounded-full border border-amber/50 px-2 py-0.5 text-[0.65rem] tracking-[0.12em] text-amber uppercase">
                {item.label}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-cream-muted">
            {item.bottle?.brands?.name ?? "—"}
            {item.bottle?.proof !== null && item.bottle?.proof !== undefined && (
              <> · {Number(item.bottle.proof)} proof</>
            )}
            {item.bottle && (
              <>
                {" · "}
                <Link
                  href={`/bourbon/${item.bottle.slug}`}
                  className="text-cream-muted underline underline-offset-2 hover:text-amber"
                >
                  /bourbon/{item.bottle.slug}
                </Link>
              </>
            )}
          </p>

          {unpublished && (
            <p className="mt-2 text-xs text-verdict-maybe">
              This bottle is {item.bottle?.status ?? "missing"}, so it would not render on the
              published guide. Publish the bottle or remove the pick.
            </p>
          )}
          {!item.rationale && (
            <p className="mt-2 text-xs text-verdict-maybe">No rationale yet.</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <MoveButton
            label={`Move ${item.bottle?.name ?? "pick"} up`}
            glyph="↑"
            disabled={isFirst || pending}
            onClick={() => run(() => moveItem(item.id, "up"))}
          />
          <MoveButton
            label={`Move ${item.bottle?.name ?? "pick"} down`}
            glyph="↓"
            disabled={isLast || pending}
            onClick={() => run(() => moveItem(item.id, "down"))}
          />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="min-h-9 rounded-full border border-ink-line px-4 text-xs text-cream-dim transition hover:border-amber hover:text-amber"
          >
            {open ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteItem(item.id))}
            className="min-h-9 rounded-full border border-ink-line px-4 text-xs text-cream-muted transition hover:border-verdict-walk hover:text-verdict-walk disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>

      {rowError && (
        <p role="alert" className="mt-3 text-xs text-verdict-walk">
          {rowError}
        </p>
      )}

      {open && (
        <form action={formAction} className="mt-5 space-y-4 border-t border-ink-line pt-5">
          <TextField
            name="label"
            label="Label"
            defaultValue={item.label}
            error={state && !state.ok ? state.fieldErrors?.label : undefined}
          />
          <TextArea
            name="rationale"
            label="Why it earned the spot"
            rows={3}
            defaultValue={item.rationale}
            error={state && !state.ok ? state.fieldErrors?.rationale : undefined}
          />
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton>Save pick</SubmitButton>
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
      )}
    </li>
  );
}

function MoveButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-line text-cream-dim transition hover:border-amber hover:text-amber disabled:opacity-30"
    >
      <span aria-hidden="true">{glyph}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
