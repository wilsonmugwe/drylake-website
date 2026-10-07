import { Download } from "lucide-react";

import { RESPONSE_TIME } from "@/lib/site";

import { fileTypeLabel, formatDate, formatFileSize } from "./format";
import MessageDrylake from "./MessageDrylake";
import type { ClientDocumentSummary } from "./types";

/* Sections shared by the overview and project views. */

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
              className="cp-row-link group flex min-h-[60px] items-center gap-4 px-5 py-3 sm:px-6"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app border border-neutral-200 bg-canvas font-mono text-[0.6rem] font-semibold tracking-[0.04em] text-neutral-600"
              >
                {fileTypeLabel(document.mimeType, document.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-neutral-900" title={document.name}>
                  {document.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-neutral-500">{meta.join(" · ")}</span>
              </span>
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app text-neutral-500 transition group-hover:bg-canvas group-hover:text-neutral-950"
              >
                <Download size={16} />
              </span>
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
    <section aria-labelledby="support-heading" className="cp-card p-5 sm:p-6">
      <p className="cp-label">Support</p>
      <h2 id="support-heading" className="cp-section-title mt-3">
        Need something from Drylake?
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-neutral-600">
        Message the team about your project, an invoice or access for a colleague. We reply within{" "}
        {RESPONSE_TIME}.
      </p>
      <MessageDrylake variant="card" />
    </section>
  );
}
