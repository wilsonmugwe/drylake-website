export default function ClientLoading() {
  return (
    <main className="admin-page">
      <div className="admin-container py-10">
        <div className="admin-skeleton h-4 w-24" />

        <div className="mt-12">
          <div className="admin-skeleton h-3 w-32" />
          <div className="admin-skeleton mt-6 h-12 w-[420px] max-w-[85%]" />
          <div className="admin-skeleton mt-4 h-4 w-56" />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="admin-surface h-40 rounded-[1.4rem]"
            />
          ))}
        </div>

        <div className="admin-surface mt-8 h-72 rounded-[1.5rem]" />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="admin-surface h-56 rounded-[1.5rem]" />
          <div className="admin-surface h-56 rounded-[1.5rem]" />
        </div>
      </div>
    </main>
  );
}