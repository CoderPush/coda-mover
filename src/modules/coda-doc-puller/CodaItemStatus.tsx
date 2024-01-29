export function CodaItemStatus ({ status }: { status?: string }) {
  if (!status || status === 'done') return null

  return (
    <span className='text-indigo-400 animate-pulse'>{status}</span>
  )
}
