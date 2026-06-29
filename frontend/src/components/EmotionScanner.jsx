import { useCallback, useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import api from '../api/client'
import { formatConfidence, pickPrimaryEmotion } from '../utils/emotions'
import EmotionConfidenceBars from './EmotionConfidenceBars'
import EmotionPicker from './EmotionPicker'

function statusMessage(status) {
  return {
    idle: 'Pronto para detetar emoções.',
    starting: 'A iniciar a câmara…',
    scanning: 'A analisar a tua cara…',
    detected: 'Emoção detetada.',
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

export default function EmotionScanner({ scanning, onScan, onScanStart, onManualSelect, manualEmotion }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const scanStartTimeRef = useRef(0)
  const scannerStartedRef = useRef(false)
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
      return false
    }

    let detection
    try {
      detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
        .withFaceExpressions()
    } catch {
      return false
    }

    if (!detection?.expressions) {
      return false
    }

    const nextExpressions = detection.expressions
    const { emotion, confidence: nextConfidence } = pickPrimaryEmotion(nextExpressions)

    setCurrentEmotion(emotion)
    currentEmotionRef.current = emotion
    setConfidence(nextConfidence)
    setExpressions(nextExpressions)

    return { emotion, confidence: nextConfidence, expressions: nextExpressions }
  }, [])

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

      streamRef.current = stream
      setScannerReady(true)
      setStatus('scanning')
      scanStartTimeRef.current = Date.now()
      scannerStartedRef.current = true
      onScanStart?.()

      // Loop de detecção: para quando confiança >= 0.5 OU passam 8 segundos
      let detected = false
      const tick = async () => {
        if (detected) return
        const result = await performScan()
        if (result && result.confidence >= 0.5) {
          detected = true
          setStatus('detected')
          try {
            await api.post('/emotions', {
              emotion: result.emotion,
              confidence: result.confidence,
              source: 'webcam',
              metadata: { expressions: result.expressions },
            })
          } catch {
            // ignore
          }
          onScan?.(result)
          stopScanner()
          return
        }
        const elapsed = Date.now() - scanStartTimeRef.current
        if (elapsed >= 8000 && !detected) {
          detected = true
          setStatus('error')
          setError('Não consegui detetar uma emoção clara. Tenta de novo ou escolhe manualmente abaixo.')
          stopScanner()
          return
        }
      }
      tick()
      timerRef.current = window.setInterval(tick, 1500)
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
  }, [onScan, onScanStart, performScan, permissionState, stopScanner])

  // Liga o stream ao elemento <video> quando scannerReady fica true
  useEffect(() => {
    if (!streamRef.current || !videoRef.current) return
    const video = videoRef.current
    const stream = streamRef.current
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
      if (scannerStartedRef.current) {
        api.patch('/sessions/end').catch(() => null)
      }
    }
  }, [stopScanner])

  // Inicia o scanner quando a prop `scanning` passa a true
  useEffect(() => {
    queueMicrotask(() => {
      if (scanning && !scannerReady) {
        startScanner()
      }
      if (!scanning && scannerReady) {
        stopScanner()
        setScannerReady(false)
      }
    })
  }, [scanning, scannerReady, startScanner, stopScanner])

  const showCamera = scannerReady
  const showStartButton = !scanning && !scannerReady

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
              ) : status === 'error' ? (
                <>
                  <strong>Não foi possível detetar</strong>
                  <p>{error || 'Tenta de novo ou escolhe manualmente abaixo.'}</p>
                </>
              ) : (
                <>
                  <strong>Pronto para começar</strong>
                  <p>Clica no botão abaixo para detetar a tua emoção.</p>
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
            <p className="micro-label">Emoção atual</p>
            <h4>{currentEmotion}</h4>
            <p className="muted-text">
              {status === 'denied'
                ? 'A app não consegue aceder à câmara. Podes usar o seletor manual em baixo.'
                : status === 'scanning'
                ? 'Mantém a cara visível e bem iluminada.'
                : 'A webcam vai detetar a tua emoção automaticamente.'}
            </p>
          </div>

          {showStartButton ? (
            <button
              type="button"
              className="intro-cta scanner-cta"
              onClick={() => onScanStart?.()}
            >
              Permitir câmara e detetar
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

      <EmotionPicker selected={manualEmotion || currentEmotion} onSelect={onManualSelect} />
    </section>
  )
}
