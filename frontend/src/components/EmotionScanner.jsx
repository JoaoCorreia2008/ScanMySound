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
    idle: 'A preparar a câmara e os modelos…',
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
  const [scannerAvailable, setScannerAvailable] = useState(true)
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

  useEffect(() => {
    if (permissionState === 'denied') {
      queueMicrotask(() => {
        setScannerAvailable(false)
        setStatus('denied')
        setError('Permissão da câmara foi bloqueada. Vai às definições do browser para a permitir.')
      })
    }
  }, [permissionState])

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

  useEffect(() => {
    if (permissionState === 'unknown' || permissionState === 'denied' || permissionState === 'unsupported') {
      return
    }

    let mounted = true

    async function init() {
      try {
        const modelPath = import.meta.env.VITE_FACE_API_MODELS_URL || '/models'

        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia indisponível neste browser.')
        }

        setStatus('idle')
        await loadFaceModels(modelPath)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => null)
        }

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
        toast.success('Scanner da webcam iniciado.')
        timerRef.current = window.setInterval(performScan, SCAN_INTERVAL)
      } catch (scannerError) {
        console.error(scannerError)
        if (!mounted) return

        const isDenied =
          scannerError?.name === 'NotAllowedError' ||
          scannerError?.name === 'PermissionDeniedError' ||
          /denied|not allowed/i.test(scannerError?.message || '')

        setScannerAvailable(false)
        setStatus(isDenied ? 'denied' : 'unavailable')
        setError(
          isDenied
            ? 'Permissão da câmara foi bloqueada. Abre as definições do browser e permite o acesso.'
            : 'Scanner automático indisponível neste dispositivo. Usa o seletor manual abaixo.'
        )

        if (isDenied) {
          setPermissionState('denied')
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (sessionStartedRef.current) {
        api.patch('/sessions/end').catch(() => null)
      }
    }
  }, [permissionState, performScan])

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

  const showCamera = scannerAvailable && status !== 'denied' && status !== 'unsupported'

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
            <video ref={videoRef} autoPlay playsInline muted />
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
                  <strong>Scanner indisponível</strong>
                  <p>Usa o seletor manual abaixo para testar a app.</p>
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
                : 'As barras atualizam em tempo real. Se a webcam não estiver disponível, podes escolher a emoção manualmente.'}
            </p>
          </div>

          <EmotionConfidenceBars expressions={expressions} />

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>

      <EmotionPicker selected={currentEmotion} onSelect={handleManualSelect} />
    </section>
  )
}
