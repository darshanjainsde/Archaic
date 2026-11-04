export default function Loading() {
  return (
    <div className="container-x pt-8 md:pt-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-12 w-2/3 max-w-md" />
      <div className="skeleton mt-4 h-5 w-1/2 max-w-sm" />
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5]" />
            <div className="skeleton mt-2 h-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
