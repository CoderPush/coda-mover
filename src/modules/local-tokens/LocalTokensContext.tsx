import { type ReactNode, createContext, useContext, useState, useEffect } from 'react'

export type ILocalTokenName = 'coda' | 'outline'

export interface ILocalTokensContextValue {
  codaApiToken: string
  outlineApiToken: string

  setApiTokenFor: (name: ILocalTokenName, token: string) => void
}

export const LocalTokensContext = createContext<ILocalTokensContextValue | undefined>(undefined)

// Create a custom hook to access the MoverClientContext value
export const useLocalTokens = (): ILocalTokensContextValue => {
  const context = useContext(LocalTokensContext)
  if (!context) {
    throw new Error('useClient must be used within <LocalTokensProvider>')
  }

  return context
}

// Create the LocalTokensProvider component
export function LocalTokensProvider ({ children }: { children: ReactNode }) {
  const [codaApiToken, setCodaApiToken] = useState('')
  const [outlineApiToken, setOutlineApiToken] = useState('')

  useEffect(function onLoad () {
    setCodaApiToken(getStoredItem('coda'))
    setOutlineApiToken(getStoredItem('outline'))
  }, [])

  const context: ILocalTokensContextValue = {
    codaApiToken,
    outlineApiToken,
    setApiTokenFor (name, token) {
      if (name === 'coda') {
        setCodaApiToken(token)
      } else if (name === 'outline') {
        setOutlineApiToken(token)
      }

      storeItem(name, token)
    },
  }

  return (
    <LocalTokensContext.Provider value={context}>
      {children}
    </LocalTokensContext.Provider>
  )
}

const getStoredItem = (key: ILocalTokenName): string => {
  if (typeof localStorage === 'undefined') return ''

  return localStorage.getItem(`__local_tokens__${key}`) || ''
}

const storeItem = (key: ILocalTokenName, value: string) => {
  if (typeof localStorage === 'undefined') return

  localStorage.setItem(`__local_tokens__${key}`, value)
}
