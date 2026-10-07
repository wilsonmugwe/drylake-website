/*
 * Route skeletons for Drylake Workspace (app/client/**\/loading.tsx). They render inside the
 * persistent frame the moment a link is clicked, in the same shapes as the page that replaces
 * them (header, figure band, sections), so the swap does not shift the layout. The shimmer
 * stops under prefers-reduced-motion (app/globals.css).
 */

function Bar({ className }: { className: string }) {
  return <div className={`cp-skeleton ${className}`} />;
}

function Busy({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

function HeaderSkeleton({ back = false, summary = true }: { back?: boolean; summary?: boolean }) {
  return (
    <div className="pb-6 sm:pb-8">
      {back ? <Bar className="mb-6 h-4 w-24" /> : null}
      <Bar className="h-3 w-24" />
      <Bar className="mt-4 h-9 w-80 max-w-[85%]" />
      {summary ? <Bar className="mt-4 h-4 w-[30rem] max-w-full" /> : null}
    </div>
  );
}

/* One band of key figures (FigureBand). */
function FigureSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="cp-card cp-figures">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="cp-figure" data-lead={index === 0 ? "true" : undefined}>
          <Bar className="h-3 w-20" />
          <Bar className={`mt-3 ${index === 0 ? "h-8 w-32" : "h-6 w-16"}`} />
          <Bar className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="cp-card overflow-hidden">
      <div className="px-5 pb-3 pt-5 sm:px-6">
        <Bar className="h-4 w-32" />
        <Bar className="mt-2 h-3 w-56 max-w-full" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-t border-neutral-200/70 px-5 py-4 sm:px-6">
          <div className="flex-1">
            <Bar className="h-4 w-1/2" />
            <Bar className="mt-2 h-3 w-1/3" />
          </div>
          <Bar className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

function TwoColumn({ main, side, wide = false }: { main: number[]; side: number[]; wide?: boolean }) {
  return (
    <div
      className={`mt-6 grid gap-6 ${wide ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"}`}
    >
      <div className="flex min-w-0 flex-col gap-6">
        {main.map((rows, index) => (
          <SectionSkeleton key={index} rows={rows} />
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {side.map((rows, index) => (
          <SectionSkeleton key={index} rows={rows} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading your Workspace" />
      <HeaderSkeleton />
      <FigureSkeleton />
      <div className="mt-6">
        <SectionSkeleton rows={1} />
      </div>
      <TwoColumn main={[3, 3]} side={[3, 1]} />
    </div>
  );
}

export function ProjectSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading project" />
      <HeaderSkeleton back summary={false} />
      <div className="cp-card grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-2">
        <div>
          <Bar className="h-3 w-20" />
          <Bar className="mt-3 h-10 w-24" />
          <Bar className="mt-4 h-2 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Bar className="h-10 w-full" />
          <Bar className="h-10 w-full" />
          <Bar className="col-span-2 h-10 w-full" />
        </div>
      </div>
      <TwoColumn main={[4, 2]} side={[2, 1]} />
    </div>
  );
}

export function BillingSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading invoices" />
      <HeaderSkeleton />
      <FigureSkeleton />
      <TwoColumn main={[4, 2]} side={[1, 1]} wide />
    </div>
  );
}

export function InvoiceSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading invoice" />
      <HeaderSkeleton back summary={false} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6 lg:order-2">
          <SectionSkeleton rows={2} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <SectionSkeleton rows={1} />
          <SectionSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
