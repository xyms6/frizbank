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
  const [status, setStatus] = useState('Clique no botão para ligar a câmera')
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
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

    if (cameraActive) {
      // Se câmera já está ativa, validar rosto
      validateFace()
      return
    }

    setIsProcessing(true)
    setStatus('Acessando câmera...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      
      // Aguardar vídeo estar pronto
      await new Promise((resolve) => {
        if (videoRef.current.readyState >= 2) {
          resolve()
        } else {
          videoRef.current.onloadedmetadata = () => resolve()
        }
      })

      setCameraActive(true)
      setStatus('Câmera ativada! Posicione seu rosto e clique em "Validar Rosto"')
      setIsProcessing(false)
    } catch (err) {
      console.error('Erro na câmera:', err)
      setStatus('Erro ao acessar a câmera')
      alert('Erro ao acessar a câmera. Verifique as permissões.')
      setIsProcessing(false)
    }
  }

  // Validar rosto e salvar no backend
  const validateFace = async () => {
    if (!videoRef.current || !videoRef.current.srcObject || !cameraActive) {
      alert('Ligue a câmera primeiro!')
      return
    }

    setIsProcessing(true)
    setStatus('Carregando modelos... Aguarde...')
    setProgress(20)

    try {
      // Carregar modelos se necessário
      const loaded = await loadFaceModels()
      if (!loaded) {
        setStatus('Tentando carregar modelos novamente...')
        // Tentar mais uma vez
        const retry = await loadFaceModels()
        if (!retry) {
          alert('Erro ao carregar modelos. Verifique sua conexão com a internet e tente novamente.')
          setIsProcessing(false)
          setProgress(0)
          return
        }
      }

      setProgress(40)
      setStatus('Detectando rosto... Posicione-se bem na frente da câmera')

      // Aguardar um pouco para garantir que o vídeo está pronto
      await new Promise(resolve => setTimeout(resolve, 500))

      // Detectar rosto com opções mais permissivas
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 320,  // Tamanho menor = mais rápido
          scoreThreshold: 0.3  // Threshold mais baixo = detecta mais facilmente
        })
      )

      if (detection) {
        setProgress(50)
        setStatus('Rosto detectado! Extraindo características...')
        
        // Aguardar um pouco para garantir estabilidade
        await new Promise(resolve => setTimeout(resolve, 300))
        
        setProgress(60)
        setStatus('Processando rosto...')
        
        // Obter descriptor do rosto com timeout e retry
        let fullDetection
        let attempts = 0
        const maxAttempts = 3
        
        while (attempts < maxAttempts && !fullDetection) {
          try {
            setStatus(`Processando rosto... (tentativa ${attempts + 1}/${maxAttempts})`)
            
            fullDetection = await Promise.race([
              faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 8000)
              )
            ])
            
            if (fullDetection && fullDetection.descriptor) {
              break // Sucesso, sair do loop
            }
          } catch (error) {
            console.warn(`Tentativa ${attempts + 1} falhou:`, error.message)
            attempts++
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500)) // Aguardar antes de tentar novamente
            }
          }
        }
        
        if (!fullDetection || !fullDetection.descriptor) {
          console.error('Falha ao processar rosto após múltiplas tentativas')
          alert('Erro ao processar rosto. Certifique-se de:\n- Estar bem iluminado\n- Olhar diretamente para a câmera\n- Não mover muito')
          setIsProcessing(false)
          setProgress(0)
          return
        }

        setProgress(70)
        setStatus('Convertendo dados...')
        
        const descriptor = fullDetection.descriptor
        
        // Verificar se descriptor é válido
        if (!descriptor || descriptor.length === 0) {
          alert('Rosto não válido. Tente novamente.')
          setIsProcessing(false)
          setProgress(0)
          return
        }
        
        setProgress(80)
        setStatus('Preparando para salvar...')
        
        const embeddingBase64 = float32ToBase64(Array.from(descriptor))

        const isRegistering = !!pendingUser
        const userId = isRegistering ? pendingUser.id : currentUser?.id
        const email = isRegistering ? pendingUser?.email : currentUser?.email

        if (!userId || !email) {
          alert('Erro: Dados de usuário não encontrados.')
          setIsProcessing(false)
          setProgress(0)
          return
        }

        try {
          setStatus('Salvando no servidor...')
          
          if (isRegistering) {
            // Salvar rosto no cadastro
            const response = await fetch(`${API_BASE_URL}/users/${userId}/face`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ faceEmbedding: embeddingBase64 })
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.error('Erro do servidor:', errorText)
              throw new Error(errorText || 'Erro ao salvar rosto no servidor')
            }

            const userUpdated = await response.json()
            console.log('✅ Rosto salvo com sucesso:', userUpdated)
            
            setProgress(100)
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
              setProgress(0)
              return
            }

            const verifiedUser = await response.json()
            console.log('✅ Rosto verificado com sucesso:', verifiedUser)
            
            setProgress(100)
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
          alert(`Erro: ${error.message || 'Erro ao comunicar com o servidor'}`)
          setIsProcessing(false)
          setProgress(0)
        }
      } else {
        alert('Nenhum rosto detectado. Certifique-se de:\n- Estar em um local bem iluminado\n- Olhar diretamente para a câmera\n- Estar a uma distância adequada')
        setIsProcessing(false)
        setProgress(0)
      }
    } catch (err) {
      console.error('Erro na validação:', err)
      alert(`Erro na validação facial: ${err.message || 'Erro desconhecido'}`)
      setIsProcessing(false)
      setProgress(0)
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
          <button
            className="btn-primary btn-full"
            onClick={startCamera}
            disabled={isProcessing}
          >
            {isProcessing 
              ? 'Processando...' 
              : cameraActive 
                ? 'Validar Rosto' 
                : 'Ligar Câmera'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

