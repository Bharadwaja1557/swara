export default function AlbumLoading() {
  return (
    <div className="min-h-screen">
      <div className="px-4 pt-4">
        <div className="w-10 h-10 rounded-full skeleton" />
      </div>
      <div className="flex flex-col items-center px-6 pt-6 pb-8">
        <div className="w-48 h-48 rounded-3xl skeleton mb-6" />
        <div className="w-48 h-6 skeleton rounded-lg mb-3" />
        <div className="w-32 h-4 skeleton rounded-lg" />
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <div className="flex-1 h-12 skeleton rounded-2xl" />
        <div className="w-28 h-12 skeleton rounded-2xl" />
      </div>
      <div className="px-4 space-y-1 pt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[60px] skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}
