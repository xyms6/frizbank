import { useState, useRef, useEffect } from 'react'
import * as faceapi from 'face-api.js'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../config/api'
import { loadFaceModels } from '../utils/faceApi'

const float32ToBase64 = (descriptor) => {
  const buffer = new Uint8Array(new Float32Array(descriptor).buffer)
  let binary = ''
  buffer.forEach(byte => { binary += String.fromCharCode(byte) })
  return window.btoa(binary)
}

export default function FaceRecognition({ onPageChange, modelsLoaded, pendingUser }) {
  const { login, currentUser } = useAuth()
  const [status, setStatus] = useState('Inicializando câmera...')
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      // Limpar stream ao desmontar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startFaceRecognition = async () => {
    if (!modelsLoaded) {
      setStatus('Carregando modelos de reconhecimento facial...')
      const loaded = await loadFaceModels()
      if (!loaded) {
        alert('Não foi possível carregar os modelos de reconhecimento facial. Verifique sua conexão com a internet e tente novamente.')
        setStatus('Erro ao carregar modelos. Tente recarregar a página.')
        return
      }
    }

    setIsProcessing(true)
    setStatus('Acessando câmera...')
    setProgress(10)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream

      setStatus('Posicione seu rosto na frente da câmera...')
      setProgress(30)

      await new Promise(resolve => setTimeout(resolve, 1000))

      const isRegistering = !!pendingUser
      const email = isRegistering ? pendingUser?.email : currentUser?.email

      if (!email) {
        setStatus('Erro: usuário não identificado para validação')
        setIsProcessing(false)
        stream.getTracks().forEach(track => track.stop())
        return
      }

      let attempts = 0
      const maxAttempts = 50

      const detectFace = async () => {
        if (attempts >= maxAttempts) {
          setStatus('Tempo esgotado. Tente novamente.')
          setProgress(0)
          setIsProcessing(false)
          stream.getTracks().forEach(track => track.stop())
          return
        }

        attempts++
        setProgress(30 + (attempts / maxAttempts) * 50)

        try {
          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor()

          if (detection) {
            const descriptor = detection.descriptor
            
            if (isRegistering) {
              if (!pendingUser || !pendingUser.email) {
                setStatus('Erro: Dados de usuário não recebidos')
                setIsProcessing(false)
                stream.getTracks().forEach(track => track.stop())
                return
              }
              const embeddingBase64 = float32ToBase64(Array.from(descriptor))
              try {
                const response = await fetch(`${API_BASE_URL}/users/${pendingUser.id}/face`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ faceEmbedding: embeddingBase64 })
                })

                if (!response.ok) {
                  throw new Error('Erro ao registrar usuário no backend')
                }

                const userUpdated = await response.json()
                setStatus('Rosto cadastrado com sucesso!')
                setProgress(100)
                setTimeout(() => {
                  stream.getTracks().forEach(track => track.stop())
                  login(userUpdated)
                  onPageChange('dashboard')
                }, 1500)
              } catch (error) {
                console.error('Erro ao registrar rosto:', error)
                setStatus('Erro ao salvar rosto. Tente novamente.')
                setIsProcessing(false)
                stream.getTracks().forEach(track => track.stop())
                alert(error.message)
              }
              return
            } else {
              // Verificar rosto
              if (!currentUser) {
                setStatus('Erro: Usuário não encontrado')
                setIsProcessing(false)
                stream.getTracks().forEach(track => track.stop())
                return
              }

              const embeddingBase64 = float32ToBase64(Array.from(descriptor))
              try {
                const response = await fetch(`${API_BASE_URL}/users/verify-face`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, faceEmbedding: embeddingBase64 })
                })

                if (!response.ok) {
                  setStatus('Rosto não reconhecido. Tente novamente...')
                  setTimeout(detectFace, 500)
                  return
                }

                const verifiedUser = await response.json()
                setStatus('Rosto reconhecido!')
                setProgress(100)
                setTimeout(() => {
                  stream.getTracks().forEach(track => track.stop())
                  login(verifiedUser)
                  onPageChange('dashboard')
                }, 1500)
              } catch (error) {
                console.error('Erro ao verificar rosto:', error)
                setStatus('Falha na verificação. Tente novamente...')
                setTimeout(detectFace, 500)
              }
            }
          } else {
            setStatus('Nenhum rosto detectado. Posicione-se melhor...')
            setTimeout(detectFace, 500)
          }
        } catch (error) {
          console.error('Erro na detecção:', error)
          setStatus('Erro na detecção. Tente novamente...')
          setTimeout(detectFace, 500)
        }
      }

      detectFace()
    } catch (error) {
      console.error('Erro ao acessar câmera:', error)
      alert('Erro ao acessar a câmera. Verifique as permissões.')
      setIsProcessing(false)
      setProgress(0)
    }
  }

  return (
    <div id="face-recognition-page" className="page active">
      <div className="auth-container">
        <div className="auth-card">
          <h2>Validação Facial</h2>
          <p className="face-instructions">Posicione seu rosto na frente da câmera e aguarde o reconhecimento</p>
          <div className="video-container">
            <video id="video" ref={videoRef} autoPlay muted playsInline></video>
            <canvas id="canvas" ref={canvasRef}></canvas>
          </div>
          <div className="face-status">
            <div id="face-status-text">{status}</div>
            <div id="face-progress" className="progress-bar">
              <div 
                id="face-progress-fill" 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <button
            id="start-face-recognition"
            className="btn-primary btn-full"
            onClick={startFaceRecognition}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processando...' : 'Iniciar Reconhecimento'}
          </button>
        </div>
      </div>
    </div>
  )
}

