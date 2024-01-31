export function CodaItemStatus ({ status, message }: { status?: string, message?: string }) {
  if (!status || status === 'done') return null

  return (
    <span className='text-indigo-400 animate-pulse' title={message}>{status}</span>
  )
}
