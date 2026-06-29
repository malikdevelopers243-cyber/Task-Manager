const EmptyState = ({ message = 'No data found.' }) => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
      <span className="text-2xl">📭</span>
    </div>
    <p className="text-sm font-medium">{message}</p>
  </div>
)

export default EmptyState
