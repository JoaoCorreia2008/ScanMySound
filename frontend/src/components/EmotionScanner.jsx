import { useCallback, useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import toast from 'react-hot-toast'
import api from '../api/client'
import { formatConfidence, pickPrimaryEmotion } from '../utils/emotions'
import EmotionConfidenceBars from './EmotionConfidenceBars'
import EmotionPicker from './EmotionPicker'

const SCAN_INTERVAL = 2800

function statusMessage(status) {
  return {
    idle: 'Pronto para detetar emoções.',
    starting: 'A pedir permissão da câmara…',
    ready: 'Câmara ativa. Emoções a serem analisadas em tempo real.',
    blocked: 'Permissão da câmara bloqueada.',
    denied: 'Câmara bloqueada — vê as instruções abaixo.',
    unsupported: 'Este browser não suporta webcam.',
    error: 'Não foi possível iniciar o scanner.',
    unavailable: 'Scanner automático indisponível. Usa o seletor manual abaixo.',
  }[status]
}

async function loadFaceModels(modelPath) {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
    faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
  ])
}

export default function EmotionScanner({ onScan }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const sessionStartedRef = useRef(false)
  const lastSentAtRef = useRef(0)
  const currentEmotionRef = useRef('neutral')

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [confidence, setConfidence] = useState(0)
  const [expressions, setExpressions] = useState({})
  const [scannerReady, setScannerReady] = useState(false)
  const [permissionState, setPermissionState] = useState('unknown')

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      queueMicrotask(() => setPermissionState('unsupported'))
      return
    }
    let active = true
    navigator.permissions
      .query({ name: 'camera' })
      .then((result) => {
        if (!active) return
        setPermissionState(result.state)
        result.addEventListener('change', () => {
          if (active) setPermissionState(result.state)
        })
      })
      .catch(() => {
        if (active) setPermissionState('unsupported')
      })
    return () => {
      active = false
    }
  }, [])

  const performScan = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      return
    }

    let detection
    try {
      detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
        .withFaceExpressions()
    } catch {
      return
    }

    if (!detection?.expressions) {
      return
    }

    const nextExpressions = detection.expressions
    const { emotion, confidence: nextConfidence } = pickPrimaryEmotion(nextExpressions)
    const previousEmotion = currentEmotionRef.current

    setCurrentEmotion(emotion)
    currentEmotionRef.current = emotion
    setConfidence(nextConfidence)
    setExpressions(nextExpressions)

    const shouldSend = Date.now() - lastSentAtRef.current > SCAN_INTERVAL || emotion !== previousEmotion
    if (!shouldSend || nextConfidence < 0.34) {
      return
    }

    lastSentAtRef.current = Date.now()

    const payload = {
      emotion,
      confidence: nextConfidence,
      source: 'webcam',
      metadata: { expressions: nextExpressions },
    }

    api.post('/emotions', payload).catch(() => null)
    onScan?.({ ...payload, expressions: nextExpressions })
  }, [onScan])

  const stopScanner = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (permissionState === 'denied') {
      setStatus('denied')
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setError('Este browser não suporta webcam.')
      return
    }

    setStatus('starting')
    setError('')

    try {
      const modelPath = import.meta.env.VITE_FACE_API_MODELS_URL || '/models'
      await loadFaceModels(modelPath)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      const videoTracks = stream.getVideoTracks()
      console.log('[scanner] Stream obtido:', {
        tracks: videoTracks.length,
        settings: videoTracks[0]?.getSettings(),
      })

      // Guarda a stream — o useEffect abaixo vai ligá-la ao <video>
      // quando o elemento estiver no DOM
      streamRef.current = stream

      try {
        await api.post('/sessions/start', {
          device: navigator.userAgent,
          userAgent: navigator.userAgent,
        })
        sessionStartedRef.current = true
      } catch {
        sessionStartedRef.current = false
      }

      setStatus('ready')
      setScannerReady(true)
      toast.success('Câmara ligada.')
      timerRef.current = window.setInterval(performScan, SCAN_INTERVAL)

      if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' })
          setPermissionState(result.state)
        } catch {
          // ignore
        }
      }
    } catch (scannerError) {
      console.error(scannerError)
      const name = scannerError?.name || 'Erro'
      const message = scannerError?.message || 'desconhecido'
      const isDenied =
        scannerError?.name === 'NotAllowedError' ||
        scannerError?.name === 'PermissionDeniedError' ||
        /denied|not allowed|permission/i.test(scannerError?.message || '')
      const isNotFound =
        scannerError?.name === 'NotFoundError' ||
        /not found|requested device not found/i.test(scannerError?.message || '')
      const isInUse =
        scannerError?.name === 'NotReadableError' ||
        /could not start|already in use|not readable/i.test(scannerError?.message || '')

      setStatus(isDenied ? 'denied' : 'error')
      setScannerReady(false)
      setError(
        isDenied
          ? 'Permissão da câmara foi bloqueada. Abre o cadeado na barra de endereço → Câmara → Permitir.'
          : isNotFound
          ? 'Nenhuma câmara encontrada. Verifica se o dispositivo tem webcam.'
          : isInUse
          ? 'A câmara está a ser usada por outra aplicação (Zoom, Teams, etc). Fecha-as e tenta de novo.'
          : `Erro: ${name}. ${message}`
      )
      if (isDenied) {
        setPermissionState('denied')
      }
    }
  }, [performScan, permissionState])

  // Liga o stream ao elemento <video> quando o streamRef muda
  // (e o elemento está no DOM porque showCamera é true neste momento)
  useEffect(() => {
    if (!streamRef.current || !videoRef.current) {
      console.log('[scanner] useEffect: sem stream ou video ref', { stream: !!streamRef.current, video: !!videoRef.current })
      return
    }

    const video = videoRef.current
    const stream = streamRef.current

    console.log('[scanner] A ligar stream ao video')
    video.srcObject = stream
    video.muted = true

    const tryPlay = () => {
      video.play().then(() => {
        console.log('[scanner] Vídeo a reproduzir', video.videoWidth, 'x', video.videoHeight)
      }).catch((err) => {
        console.warn('[scanner] play() falhou:', err?.name, err?.message)
        setTimeout(tryPlay, 200)
      })
    }
    tryPlay()
  }, [scannerReady])

  useEffect(() => {
    return () => {
      stopScanner()
      if (sessionStartedRef.current) {
        api.patch('/sessions/end').catch(() => null)
      }
    }
  }, [stopScanner])

  const handleRequestCamera = useCallback(() => {
    startScanner()
  }, [startScanner])

  const handleManualSelect = useCallback(
    async (emotion) => {
      const nextConfidence = 0.85
      setCurrentEmotion(emotion)
      currentEmotionRef.current = emotion
      setConfidence(nextConfidence)
      setExpressions({ [emotion]: nextConfidence })

      const payload = {
        emotion,
        confidence: nextConfidence,
        source: 'manual',
        metadata: { source: 'manual-picker' },
      }

      try {
        await api.post('/emotions', payload)
      } catch {
        // mantém UX funcional mesmo se a BD não responder
      }

      onScan?.({ ...payload, expressions: { [emotion]: nextConfidence } })
    },
    [onScan],
  )

  const showCamera = scannerReady && status !== 'denied' && status !== 'unsupported' && status !== 'error'
  const showPermissionButton =
    !scannerReady &&
    status !== 'starting' &&
    status !== 'denied' &&
    status !== 'unsupported' &&
    status !== 'error'

  return (
    <section className="scanner-card glass-panel">
      <div className="panel-heading">
        <div>
          <p className="micro-label">Análise em tempo real</p>
          <h3>{statusMessage(status)}</h3>
        </div>
        <div className="status-pill">{formatConfidence(confidence)}</div>
      </div>

      <div className="scanner-grid">
        <div className="video-frame">
          {showCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => console.log('[scanner] Video metadata loaded', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)}
            />
          ) : (
            <div className="video-placeholder">
              <span className="live-dot" />
              {status === 'denied' ? (
                <>
                  <strong>Câmara bloqueada</strong>
                  <p>
                    Permissão foi negada. Abre as definições do browser → Permissões do site
                    → Câmara → Permitir.
                  </p>
                </>
              ) : status === 'unsupported' ? (
                <>
                  <strong>Browser incompatível</strong>
                  <p>Usa Chrome, Edge ou Safari para aceder à webcam.</p>
                </>
              ) : (
                <>
                  <strong>Pronto para começar</strong>
                  <p>Clica no botão abaixo para ligar a câmara e detetar a tua emoção.</p>
                </>
              )}
            </div>
          )}
          {showCamera ? (
            <div className="video-overlay">
              <span className="live-dot" />
              <strong>{currentEmotion}</strong>
            </div>
          ) : null}
        </div>

        <div className="scanner-copy">
          <div>
            <p className="micro-label">Emoção detetada</p>
            <h4>{currentEmotion}</h4>
            <p className="muted-text">
              {status === 'denied'
                ? 'A app não consegue aceder à câmara. Podes usar o seletor manual em baixo para continuar.'
                : 'A webcam deteta a tua emoção em tempo real. Podes também escolher manualmente abaixo.'}
            </p>
          </div>

          {showPermissionButton ? (
            <button
              type="button"
              className="intro-cta scanner-cta"
              onClick={handleRequestCamera}
              disabled={status === 'starting'}
            >
              {status === 'starting' ? 'A ligar…' : 'Permitir câmara e detetar'}
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          ) : null}

          <EmotionConfidenceBars expressions={expressions} />

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>

      <EmotionPicker selected={currentEmotion} onSelect={handleManualSelect} />
    </section>
  )
}
