import { useEffect, useState } from 'react'

export function usePwaInstall() {
  const [installable, setInstallable] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    queueMicrotask(() => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      setInstalled(isStandalone)
    })

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

  return { installable: installable && !installed, installed, promptInstall }
}
