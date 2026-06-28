import { useMemo } from 'react'
import { SessionContext } from './sessionState'
import { getSessionId, clearSession } from '../api/client'

export function SessionProvider({ children }) {
  const value = useMemo(
    () => ({
      sessionId: getSessionId(),
      reset: () => {
        clearSession()
        window.location.reload()
      },
    }),
    [],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
