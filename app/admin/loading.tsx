export default function AdminLoading() {
  return (
    <main className="admin-page">
      <div className="admin-container py-10 sm:py-12">
        <div className="admin-skeleton h-3 w-28" />
        <div className="admin-skeleton mt-7 h-12 w-72 max-w-[75%]" />
        <div className="admin-skeleton mt-4 h-4 w-[420px] max-w-full" />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="admin-surface min-h-[150px] rounded-[1.4rem] p-6"
            >
              <div className="admin-skeleton h-9 w-9" />
              <div className="admin-skeleton mt-8 h-7 w-16" />
              <div className="admin-skeleton mt-3 h-3 w-28" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="admin-surface rounded-[1.5rem] p-6"
            >
              <div className="admin-skeleton h-5 w-36" />

              <div className="mt-8 space-y-5">
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-4"
                  >
                    <div className="admin-skeleton h-10 w-10 shrink-0" />
                    <div className="flex-1">
                      <div className="admin-skeleton h-4 w-1/2" />
                      <div className="admin-skeleton mt-2 h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}