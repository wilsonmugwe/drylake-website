import { COOKIE_CATEGORIES, inventoryFor } from "@/lib/privacy/storage-inventory";

/*
 * The four standard categories and the real entries in each, from lib/privacy/storage-inventory.ts
 * (evidence: docs/privacy/2026-10-16-cookie-audit.md). Stacked blocks, not a table, so it reads
 * cleanly at 320 px. Server component.
 */
export default function StorageInventory() {
  return (
    <div className="mt-4 space-y-6" data-testid="storage-inventory">
      {COOKIE_CATEGORIES.map((category) => {
        const entries = inventoryFor(category.id);
        return (
          <div key={category.id} data-category={category.id}>
            <h3 className="text-base font-semibold text-black">{category.label}</h3>
            <p className="mt-1 text-sm leading-6 text-black/65">{category.summary}</p>
            {entries.length === 0 ? (
              <p className="mt-2 text-sm font-medium text-black/80">None in use.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/10 border-y border-black/10">
                {entries.map((entry) => (
                  <li key={entry.name} className="py-3 text-sm leading-6 text-black/70">
                    <p>
                      <code className="break-all rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[0.8rem] text-black">{entry.name}</code>{" "}
                      <span className="text-black/60">
                        {entry.provider}, {entry.kind === "none" ? "sets nothing in your browser" : entry.kind === "cookie" ? "cookie" : "browser storage"}
                      </span>
                    </p>
                    <p className="mt-1">{entry.purpose}</p>
                    <p className="mt-1 text-black/60">
                      Lasts: {entry.duration}. Where: {entry.where}.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
