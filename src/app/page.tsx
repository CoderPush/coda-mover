'use client'

import { CodaDocPuller } from '@/modules/coda-doc-puller'
import { MoverClientProvider } from '@/modules/simple-mover/client'
import { OutlineDocPusher } from '@/modules/outline-doc-pusher/OutlineDocPusher'
import { LocalTokensProvider } from '@/modules/local-tokens'

export default function Home () {
  return (
    <MoverClientProvider>
      <LocalTokensProvider>
        <CodaDocPuller />
        <OutlineDocPusher />
      </LocalTokensProvider>
    </MoverClientProvider>
  )
}
