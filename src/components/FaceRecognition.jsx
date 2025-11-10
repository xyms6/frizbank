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

  // Iniciar câmera
  const startCamera = async () => {
    if (!videoRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setStatus('Câmera ativada. Clique em "Validar Rosto" para continuar.')
    } catch (err) {
      console.error('Erro na câmera:', err)
      alert('Erro ao acessar a câmera. Verifique as permissões.')
    }
  }

  // Validar rosto e salvar no backend
  const validateFace = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      alert('Ligue a câmera primeiro!')
      return
    }

    setIsProcessing(true)
    setStatus('Carregando modelos...')

    try {
      // Carregar modelos se necessário
      const loaded = await loadFaceModels()
      if (!loaded) {
        alert('Erro ao carregar modelos faciais.')
        setIsProcessing(false)
        return
      }

      setStatus('Detectando rosto...')

      // Detectar rosto
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      )

      if (detection) {
        setStatus('Rosto detectado! Salvando no servidor...')
        
        // Obter descriptor do rosto
        const fullDetection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (!fullDetection || !fullDetection.descriptor) {
          alert('Erro ao processar rosto. Tente novamente.')
          setIsProcessing(false)
          return
        }

        const descriptor = fullDetection.descriptor
        const embeddingBase64 = float32ToBase64(Array.from(descriptor))

        const isRegistering = !!pendingUser
        const userId = isRegistering ? pendingUser.id : currentUser?.id
        const email = isRegistering ? pendingUser?.email : currentUser?.email

        if (!userId || !email) {
          alert('Erro: Dados de usuário não encontrados.')
          setIsProcessing(false)
          return
        }

        try {
          if (isRegistering) {
            // Salvar rosto no cadastro
            const response = await fetch(`${API_BASE_URL}/users/${userId}/face`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ faceEmbedding: embeddingBase64 })
            })

            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(errorText || 'Erro ao salvar rosto')
            }

            const userUpdated = await response.json()
            console.log('Rosto salvo com sucesso:', userUpdated)
            
            setStatus('✅ Rosto cadastrado com sucesso!')
            
            setTimeout(() => {
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
              }
              login(userUpdated)
              onPageChange('dashboard')
            }, 1500)
          } else {
            // Verificar rosto no login
            const response = await fetch(`${API_BASE_URL}/users/verify-face`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, faceEmbedding: embeddingBase64 })
            })

            if (!response.ok) {
              alert('Rosto não reconhecido. Tente novamente.')
              setIsProcessing(false)
              return
            }

            const verifiedUser = await response.json()
            console.log('Rosto verificado com sucesso:', verifiedUser)
            
            setStatus('✅ Rosto reconhecido!')
            
            setTimeout(() => {
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
              }
              login(verifiedUser)
              onPageChange('dashboard')
            }, 1500)
          }
        } catch (error) {
          console.error('Erro ao salvar/verificar rosto:', error)
          alert(`Erro: ${error.message}`)
          setIsProcessing(false)
        }
      } else {
        alert('Nenhum rosto detectado. Tente novamente.')
        setIsProcessing(false)
      }
    } catch (err) {
      console.error('Erro na validação:', err)
      alert('Erro na validação facial.')
      setIsProcessing(false)
    }
  }

  // Carregar modelos ao montar
  useEffect(() => {
    loadFaceModels().catch(err => console.error('Erro ao carregar modelos:', err))
  }, [])

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
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              className="btn-primary btn-full"
              onClick={startCamera}
              disabled={isProcessing}
            >
              Ligar Câmera
            </button>
            <button
              className="btn-primary btn-full"
              onClick={validateFace}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processando...' : 'Validar Rosto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

