/*
 * Route skeletons for the client portal (app/client/**\/loading.tsx). They render inside
 * the persistent frame the moment a link is clicked, in the same card shapes as the page
 * that replaces them, so the swap does not shift the layout.
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

function HeaderSkeleton({ back = false }: { back?: boolean }) {
  return (
    <div className="pb-6 sm:pb-8">
      {back ? <Bar className="mb-5 h-4 w-24" /> : null}
      <Bar className="h-3 w-28" />
      <Bar className="mt-3 h-8 w-72 max-w-[80%]" />
      <Bar className="mt-3 h-4 w-[26rem] max-w-full" />
    </div>
  );
}

function MetricSkeleton({ count, wide = false }: { count: number; wide?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${wide ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`cp-card p-5 ${index === 0 ? "col-span-2" : ""} ${wide ? "xl:col-span-1" : "lg:col-span-1"}`}
        >
          <div className="flex items-center justify-between">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-8" />
          </div>
          <Bar className="mt-5 h-7 w-16" />
          <Bar className="mt-3 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="cp-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-neutral-200/80 px-5 py-4 sm:px-6">
        <Bar className="h-8 w-8" />
        <div className="flex-1">
          <Bar className="h-4 w-32" />
          <Bar className="mt-2 h-3 w-48 max-w-full" />
        </div>
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-t border-neutral-200/60 px-5 py-4 first:border-t-0 sm:px-6">
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

function TwoColumn({ main, side }: { main: number[]; side: number[] }) {
  return (
    <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        {main.map((rows, index) => (
          <SectionSkeleton key={index} rows={rows} />
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
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
      <Busy label="Loading your workspace" />
      <HeaderSkeleton />
      <MetricSkeleton count={3} />
      <TwoColumn main={[3, 2]} side={[2, 2]} />
    </div>
  );
}

export function ProjectSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading project" />
      <HeaderSkeleton back />
      <MetricSkeleton count={4} wide />
      <TwoColumn main={[4, 2]} side={[2]} />
    </div>
  );
}

export function BillingSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading invoices" />
      <HeaderSkeleton />
      <MetricSkeleton count={3} />
      <TwoColumn main={[5]} side={[1]} />
    </div>
  );
}

export function InvoiceSkeleton() {
  return (
    <div aria-busy="true">
      <Busy label="Loading invoice" />
      <HeaderSkeleton back />
      <TwoColumn main={[1, 3]} side={[2]} />
    </div>
  );
}
