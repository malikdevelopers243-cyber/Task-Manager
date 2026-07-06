import React from 'react'

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const EODViewer = ({ report, onClose, onMarkReviewed }) => {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">End of Day Summary</h3>
            <p className="mt-1 text-sm text-slate-400">{report.employeeName} — {formatDate(report.date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-300">Completed</h4>
            <p className="mt-2 whitespace-pre-wrap text-slate-200">{report.completed || '—'}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-300">Tomorrow</h4>
            <p className="mt-2 whitespace-pre-wrap text-slate-200">{report.tomorrow || '—'}</p>
          </div>

          {report.reviewed && (
            <div>
              <h4 className="text-sm font-semibold text-slate-300">Status</h4>
              <p className="mt-1 text-sm text-emerald-300">Reviewed</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {!report.reviewed && onMarkReviewed && (
            <button
              type="button"
              onClick={() => onMarkReviewed(report.id)}
              className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Mark reviewed
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default EODViewer
