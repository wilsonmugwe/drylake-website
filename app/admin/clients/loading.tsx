export default function ClientsLoading() {
  return (
    <main className="admin-page">
      <div className="admin-container py-10">
        <div className="admin-skeleton h-4 w-20" />

        <div className="mt-12 flex items-end justify-between gap-6">
          <div className="flex-1">
            <div className="admin-skeleton h-12 w-52" />
            <div className="admin-skeleton mt-4 h-4 w-[420px] max-w-full" />
          </div>

          <div className="admin-skeleton hidden h-12 w-36 sm:block" />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="admin-surface h-36 rounded-[1.4rem]"
            />
          ))}
        </div>

        <div className="admin-surface mt-6 overflow-hidden rounded-[1.5rem]">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4 border-b border-black/[0.07] p-6 last:border-0"
            >
              <div className="admin-skeleton h-11 w-11 shrink-0" />

              <div className="flex-1">
                <div className="admin-skeleton h-4 w-40" />
                <div className="admin-skeleton mt-2 h-3 w-56 max-w-[70%]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}