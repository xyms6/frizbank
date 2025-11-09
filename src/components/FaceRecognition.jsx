import { useState, useRef, useEffect } from 'react'
import * as faceapi from 'face-api.js'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../config/api'
import { loadFaceModels } from '../utils/faceApi'

const descriptorStorageKey = (email) => email ? `faceDescriptors_${email}` : null

const serializeDescriptor = (descriptor) => Array.from(descriptor)

const saveDescriptor = (email, descriptor) => {
  const key = descriptorStorageKey(email)
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify([serializeDescriptor(descriptor)]))
  } catch (error) {
    console.error('Erro ao salvar descritor facial localmente:', error)
  }
}

const loadStoredDescriptors = (email) => {
  const key = descriptorStorageKey(email)
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(values => new Float32Array(values))
  } catch (error) {
    console.error('Erro ao carregar descritores salvos localmente:', error)
    return []
  }
}

const float32ToBase64 = (array) => {
  const buffer = new Uint8Array(new Float32Array(array).buffer)
  let binary = ''
  buffer.forEach(byte => { binary += String.fromCharCode(byte) })
  return window.btoa(binary)
}

const base64ToFloat32 = (base64) => {
  try {
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Float32Array(bytes.buffer)
  } catch (error) {
    console.error('Erro ao converter Base64 para Float32Array:', error)
    return null
  }
}

const byteArrayToFloat32 = (byteArray) => {
  try {
    const bytes = new Uint8Array(byteArray)
    return new Float32Array(bytes.buffer)
  } catch (error) {
    console.error('Erro ao converter byte[] para Float32Array:', error)
    return null
  }
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

      // Determinar se está registrando ou fazendo login
      let email = currentUser?.email
      if (!email) {
        email = localStorage.getItem('registeringEmail')
      }
      
      const storedDescriptors = loadStoredDescriptors(email)
      const backendEmbedding = currentUser?.faceEmbedding
      const backendDescriptor = backendEmbedding
        ? (typeof backendEmbedding === 'string'
            ? base64ToFloat32(backendEmbedding)
            : Array.isArray(backendEmbedding)
              ? byteArrayToFloat32(backendEmbedding)
              : null)
        : null

      const isRegistering = !!pendingUser
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
              const userData = { ...pendingUser, faceEmbedding: embeddingBase64 }
              fetch(`${API_BASE_URL}/users/${pendingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
              })
                .then(async response => {
                  if (!response.ok) throw new Error('Erro ao registrar usuário no backend')
                  const userUpdated = await response.json()
                  saveDescriptor(pendingUser.email, descriptor)
                  localStorage.removeItem('registeringEmail')
                  setStatus('Rosto cadastrado com sucesso no backend!')
                  setProgress(100)
                  setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop())
                    // Fazer login automático com o usuário criado
                    login(userUpdated)
                    onPageChange('dashboard')
                  }, 1500)
                })
                .catch((err) => {
                  setStatus('Erro ao salvar no backend')
                  setIsProcessing(false)
                  stream.getTracks().forEach(track => track.stop())
                  alert('Erro ao registrar usuário no backend: ' + err.message)
                })
              return
            } else {
              // Verificar rosto
              if (!email || !currentUser) {
                setStatus('Erro: Usuário não encontrado')
                setIsProcessing(false)
                stream.getTracks().forEach(track => track.stop())
                return
              }

              let descriptorsToCompare = storedDescriptors
              if ((!descriptorsToCompare || descriptorsToCompare.length === 0) && backendDescriptor) {
                descriptorsToCompare = [backendDescriptor]
                saveDescriptor(email, backendDescriptor)
              }

              if (descriptorsToCompare && descriptorsToCompare.length > 0) {
                const labeledDescriptors = [new faceapi.LabeledFaceDescriptors('person0', descriptorsToCompare)]
                const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6)
                const bestMatch = faceMatcher.findBestMatch(descriptor)
                
                if (bestMatch.label === 'person0' && bestMatch.distance < 0.6) {
                  setStatus('Rosto reconhecido!')
                  setProgress(100)
                  saveDescriptor(email, descriptor)
                  
                  setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop())
                    login(currentUser)
                    onPageChange('dashboard')
                  }, 1500)
                } else {
                  setStatus('Rosto não reconhecido. Tente novamente...')
                  setTimeout(detectFace, 500)
                }
              } else {
                setStatus('Erro: Descritor facial não encontrado no dispositivo')
                setIsProcessing(false)
                stream.getTracks().forEach(track => track.stop())
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

