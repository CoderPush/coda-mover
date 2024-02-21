export function CodaItemStatus ({ status, message }: { status?: string, message?: string }) {
  if (!status || status === 'done') return null
  const isError = status.includes('error')

  return (
    <span className={message ? 'tooltip tooltip-left' : ''} data-tooltip={message}>
      <span
        className={`badge animate-pulse ${isError ? 'badge-error' : 'badge-primary'}`} title={message}
      >
        {status}
      </span>
    </span>
  )
}
