import { useState, useRef, useEffect } from 'react'
import * as faceapi from 'face-api.js'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../config/api'
import { loadFaceModels } from '../utils/faceApi'

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
      
      const savedDescriptors = email ? localStorage.getItem(`faceDescriptors_${email}`) : null
      const isRegistering = !savedDescriptors
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
              // Converter para Base64
              function float32ToBase64(array) {
                let buf = new Uint8Array(new Float32Array(array).buffer);
                let binary = '';
                for (let i = 0; i < buf.byteLength; i++) {
                  binary += String.fromCharCode(buf[i]);
                }
                return window.btoa(binary);
              }
              const embeddingBase64 = float32ToBase64(Array.from(descriptor));
              const userData = { ...pendingUser, faceEmbedding: embeddingBase64 };
              fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
              })
                .then(async response => {
                  if (!response.ok) throw new Error('Erro ao registrar usuário no backend');
                  const userCreated = await response.json();
                  setStatus('Rosto cadastrado com sucesso no backend!');
                  setProgress(100);
                  setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop())
                    // Fazer login automático com o usuário criado
                    login(userCreated)
                    onPageChange('dashboard')
                  }, 1500);
                })
                .catch((err) => {
                  setStatus('Erro ao salvar no backend');
                  setIsProcessing(false);
                  stream.getTracks().forEach(track => track.stop())
                  alert('Erro ao registrar usuário no backend: ' + err.message)
                });
              return;
            } else {
              // Verificar rosto
              if (!email || !currentUser) {
                setStatus('Erro: Usuário não encontrado')
                setIsProcessing(false)
                stream.getTracks().forEach(track => track.stop())
                return
              }
              
              const savedDescriptors = JSON.parse(localStorage.getItem(`faceDescriptors_${email}`))
              
              if (savedDescriptors && savedDescriptors.length > 0) {
                const faceMatcher = new faceapi.FaceMatcher(savedDescriptors, 0.6)
                const bestMatch = faceMatcher.findBestMatch(descriptor)
                
                if (bestMatch.label === 'person0' && bestMatch.distance < 0.6) {
                  setStatus('Rosto reconhecido!')
                  setProgress(100)
                  
                  setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop())
                    onPageChange('dashboard')
                  }, 1500)
                } else {
                  setStatus('Rosto não reconhecido. Tente novamente...')
                  setTimeout(detectFace, 500)
                }
              } else {
                setStatus('Erro: Descritor facial não encontrado')
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

