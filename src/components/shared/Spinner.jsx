const Spinner = ({ className = 'h-4 w-4', color = 'border-white' }) => (
  <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className} ${color}`} />
)

export default Spinner
