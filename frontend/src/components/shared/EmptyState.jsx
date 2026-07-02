const EmptyState = ({ message = 'No data found.' }) => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
    <p className="text-sm font-medium">{message}</p>
  </div>
)

export default EmptyState
