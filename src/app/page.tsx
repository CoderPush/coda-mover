'use client'

import { CodaDocPuller } from '@/modules/coda-doc-puller'
import { MoverClientProvider } from '@/modules/mover/client'
import { OutlineDocPusher } from '@/modules/outline-doc-pusher/OutlineDocPusher'

export default function Home () {
  return (
    <MoverClientProvider>
      <CodaDocPuller />
      <OutlineDocPusher />
    </MoverClientProvider>
  )
}
