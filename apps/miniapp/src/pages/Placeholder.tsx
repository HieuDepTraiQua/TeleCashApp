export function Placeholder({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
      <div className="text-5xl mb-3">{emoji}</div>
      <div className="text-lg font-semibold text-slate-600">{title}</div>
      <div className="text-sm">Sẽ có ở các phase tiếp theo</div>
    </div>
  );
}
