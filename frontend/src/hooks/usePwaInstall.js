import { useEffect, useState } from 'react'

function isRunningAsInstalled() {
  if (typeof window === 'undefined') return false

  const standaloneMQ = window.matchMedia('(display-mode: standalone)')
  const standaloneIOS = window.navigator.standalone === true

  return standaloneMQ.matches || standaloneIOS
}

export function usePwaInstall() {
  const [installable, setInstallable] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    queueMicrotask(() => setInstalled(isRunningAsInstalled()))

    const standaloneMQ = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = () => setInstalled(isRunningAsInstalled())
    if (standaloneMQ.addEventListener) {
      standaloneMQ.addEventListener('change', onDisplayModeChange)
    }

    const onPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setInstallable(true)
    }

    const onInstalled = () => {
      setInstalled(true)
      setInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      if (standaloneMQ.removeEventListener) {
        standaloneMQ.removeEventListener('change', onDisplayModeChange)
      }
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstallable(false)
    }
    setDeferredPrompt(null)
    return choice.outcome === 'accepted'
  }

  return {
    installable: installable && !installed,
    installed,
    promptInstall,
  }
}
