import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import api from '../api/client'

const emotionLabels = ['happy', 'sad', 'angry', 'neutral', 'surprised']

function pickPrimaryEmotion(expressions = {}) {
  let bestEmotion = 'neutral'
  let highestScore = 0

  for (const emotion of emotionLabels) {
    const score = expressions[emotion] || 0
    if (score > highestScore) {
      highestScore = score
      bestEmotion = emotion
    }
  }

  return { emotion: bestEmotion, confidence: highestScore }
}

export default function EmotionDetector({ onEmotionDetected }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let intervalId
    let mediaStream
    let mounted = true

    async function init() {
      try {
        const modelPath = import.meta.env.VITE_FACE_API_MODELS_URL || '/models'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
          faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
        ])

        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        if (!mounted) {
          return
        }

        setIsReady(true)

        intervalId = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            return
          }

          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions()

          const { emotion, confidence } = pickPrimaryEmotion(detection?.expressions)

          if (confidence < 0.35) {
            return
          }

          setCurrentEmotion(emotion)
          onEmotionDetected(emotion)

          await api.post('/emotions', { emotion })
        }, 2500)
      } catch {
        if (mounted) {
          setError(
            'Could not initialize facial emotion detection. Check webcam permissions and face-api model files.',
          )
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [onEmotionDetected])

  return (
    <section className="card detector-card">
      <h2>Live Emotion Scan</h2>
      <p>Real-time webcam analysis using face-api.js.</p>
      <div className="video-wrapper">
        <video ref={videoRef} autoPlay playsInline muted />
      </div>
      <p>
        Status: <strong>{isReady ? 'Tracking' : 'Preparing models...'}</strong>
      </p>
      <p>
        Current Emotion: <strong>{currentEmotion}</strong>
      </p>
      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}
