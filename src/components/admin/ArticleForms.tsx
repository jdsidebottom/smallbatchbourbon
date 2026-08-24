"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/admin/bottles/actions";
import {
  ActionSection,
  SelectField,
  TextArea,
  TextField,
} from "@/components/admin/fields";
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_LABELS,
  ARTICLE_ROUTE_PREFIX,
  isGuideType,
  type ArticleType,
} from "@/lib/domain/article";
import type { ArticleRow } from "@/lib/data/articles";

const TYPE_OPTIONS = ARTICLE_TYPES.map((type) => ({
  value: type,
  label: `${ARTICLE_TYPE_LABELS[type]} — ${ARTICLE_ROUTE_PREFIX[type]}/…`,
}));

const FORMATTING_HINT =
  "Supports ## headings, - lists, **bold** and [links](/bourbon/slug). Nothing else is interpreted.";

/**
 * Identity and copy. The type selector drives the public URL and whether the
 * guide builder appears at all, so it is shown live rather than only after a
 * save.
 */
export function ArticleIdentityForm({
  article,
  action,
}: {
  article: ArticleRow | null;
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
}) {
  const [type, setType] = useState<ArticleType>(article?.article_type ?? "buying_guide");
  const [slug, setSlug] = useState(article?.slug ?? "");

  return (
    <ActionSection
      title={article ? "Article" : "New article"}
      description={
        article
          ? "Bottle facts are never entered here. Picks pull proof, reference price, the price ladder and the verdict from the canonical bottle record."
          : "Pick a type and a slug to start. Everything else can be filled in afterwards."
      }
      action={action}
      submitLabel={article ? "Save" : "Create article"}
    >
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="articleType"
              label="Type"
              options={TYPE_OPTIONS}
              defaultValue={type}
              onChange={(value) => setType(value as ArticleType)}
              error={errors.articleType}
            />
            <TextField
              name="slug"
              label="Slug"
              required
              defaultValue={slug}
              onChange={setSlug}
              error={errors.slug}
              hint="One path segment. No slashes."
            />
          </div>

          {/* The editor sees the URL they are creating before they save it. */}
          <p className="text-xs text-cream-muted">
            Public URL:{" "}
            <span className="text-amber">
              {ARTICLE_ROUTE_PREFIX[type]}/{slug || "…"}
            </span>
          </p>

          <TextField name="title" label="Title" required defaultValue={article?.title} error={errors.title} />

          <TextArea
            name="excerpt"
            label="Meta description"
            rows={2}
            defaultValue={article?.excerpt}
            error={errors.excerpt}
            hint="Under 200 characters. This is what shows in search results."
          />

          <TextArea
            name="intro"
            label="Intro"
            rows={4}
            defaultValue={article?.intro}
            error={errors.intro}
            hint={`Runs above the picks. ${FORMATTING_HINT}`}
          />

          <TextArea
            name="body"
            label="Body"
            rows={12}
            defaultValue={article?.body}
            error={errors.body}
            hint={
              isGuideType(type)
                ? `Optional for a guide — the picks carry the substance. ${FORMATTING_HINT}`
                : FORMATTING_HINT
            }
          />

          <TextArea
            name="methodology"
            label="Methodology"
            rows={5}
            defaultValue={article?.methodology}
            error={errors.methodology}
            hint={
              isGuideType(type)
                ? "Required to publish a guide. How taste, value, availability and consistency were weighed."
                : "Optional for this type."
            }
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="heroImagePath"
              label="Hero image path"
              defaultValue={article?.hero_image_path}
              error={errors.heroImagePath}
            />
            <TextField
              name="heroImageAlt"
              label="Hero image alt text"
              defaultValue={article?.hero_image_alt}
              error={errors.heroImageAlt}
            />
          </div>

          <TextField
            name="reviewedAt"
            label="Last reviewed"
            type="date"
            defaultValue={article?.reviewed_at}
            error={errors.reviewedAt}
            hint="The date the content was genuinely reviewed — not today's date by default."
          />
        </>
      )}
    </ActionSection>
  );
}

export function ArticleSourceForm({
  action,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
}) {
  return (
    <ActionSection
      title="Add a source"
      description="Learn and Gear pages make claims of their own, so they cite their own sources rather than inheriting a bottle record's."
      action={action}
      submitLabel="Record source"
    >
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="sourceType"
              label="Type"
              defaultValue="press"
              error={errors.sourceType}
              options={[
                { value: "producer", label: "Producer" },
                { value: "ttb_label", label: "TTB label" },
                { value: "retailer", label: "Retailer" },
                { value: "press", label: "Press" },
                { value: "distillery_visit", label: "Distillery visit" },
                { value: "first_party_tasting", label: "First-party tasting" },
                { value: "other", label: "Other" },
              ]}
            />
            <TextField
              name="verifiedAt"
              label="Verified on"
              type="date"
              required
              error={errors.verifiedAt}
            />
          </div>
          <TextField name="url" label="URL" defaultValue="" error={errors.url} />
          <TextField name="title" label="Title" defaultValue="" error={errors.title} />
          <TextArea
            name="internalNotes"
            label="Internal notes"
            rows={2}
            defaultValue=""
            error={errors.internalNotes}
          />
        </>
      )}
    </ActionSection>
  );
}
