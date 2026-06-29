const SkeletonRow = ({ columns = 6 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <div className="h-4 w-full rounded-full bg-slate-200/70" />
      </td>
    ))}
  </tr>
)

export default SkeletonRow
