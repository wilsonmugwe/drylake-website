import { ArrowUpRight, Download } from "lucide-react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import { fileTypeLabel, formatDate, formatFileSize } from "./format";
import type { ClientDocumentSummary } from "./types";

/* Sections shared by the dashboard and project views. */

export function DocumentList({
  items,
  showProject = false,
}: {
  items: ClientDocumentSummary[];
  showProject?: boolean;
}) {
  return (
    <ul>
      {items.map((document) => {
        const size = formatFileSize(document.sizeBytes);
        const meta = [
          showProject ? document.projectName : null,
          formatDate(document.createdAt, ""),
          size,
        ].filter(Boolean);

        return (
          <li key={document.id} className="cp-row">
            {/* Plain anchor: the route answers with a redirect to a short-lived signed URL. */}
            <a
              href={`/api/client/documents/${document.id}/download`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-6"
            >
              <span className="tech-label flex h-9 w-11 shrink-0 items-center justify-center border border-white/[0.12] text-white/60">
                {fileTypeLabel(document.mimeType, document.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white" title={document.name}>
                  {document.name}
                </span>
                <span className="mt-1 block truncate text-xs text-white/55">{meta.join(" / ")}</span>
              </span>
              <Download
                aria-hidden="true"
                size={16}
                className="shrink-0 text-white/45 transition-colors group-hover:text-[#f26a2e]"
              />
              <span className="sr-only">Download</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function SupportCard() {
  return (
    <section aria-labelledby="support-heading" className="cp-panel p-5 sm:p-6">
      <p className="tech-label text-white/50">Support</p>
      <h2 id="support-heading" className="mt-3 text-lg font-semibold tracking-[-0.03em]">
        Need something from Drylake?
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Email the team about your project, an invoice or access for a colleague. We reply within{" "}
        {RESPONSE_TIME}.
      </p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="button-light group mt-5 flex min-h-[48px] w-full items-center justify-between gap-4 bg-white px-5 text-sm font-semibold"
      >
        <span className="truncate">{CONTACT_EMAIL}</span>
        <ArrowUpRight
          aria-hidden="true"
          size={16}
          className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </a>
    </section>
  );
}
