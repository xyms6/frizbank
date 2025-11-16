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
    setProgress(10)

    try {
      // Verificar e carregar TODOS os modelos necessários
      if (!faceapi.nets.tinyFaceDetector.isLoaded || 
          !faceapi.nets.faceLandmark68Net.isLoaded || 
          !faceapi.nets.faceRecognitionNet.isLoaded) {
        setStatus('Carregando modelos faciais...')
        setProgress(20)
        
        const loaded = await loadFaceModels()
        if (!loaded) {
          alert('Erro ao carregar modelos. Verifique sua conexão com a internet e tente novamente.')
          setIsProcessing(false)
          setProgress(0)
          return
        }
      }
      
      // Verificar novamente se todos estão carregados
      if (!faceapi.nets.tinyFaceDetector.isLoaded || 
          !faceapi.nets.faceLandmark68Net.isLoaded || 
          !faceapi.nets.faceRecognitionNet.isLoaded) {
        alert('Modelos não carregados corretamente. Recarregue a página.')
        setIsProcessing(false)
        setProgress(0)
        return
      }
      
      console.log('✅ Todos os modelos estão carregados!')

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
        
        // Obter descriptor do rosto - os modelos já estão carregados
        let fullDetection = null
        
        try {
          fullDetection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.3
            }))
            .withFaceLandmarks()
            .withFaceDescriptor()
          
          console.log('✅ Descriptor obtido! Tamanho:', fullDetection?.descriptor?.length || 0)
          
        } catch (error) {
          console.error('❌ Erro ao processar descriptor:', error)
          alert('Erro ao processar rosto. Tente novamente.')
          setIsProcessing(false)
          setProgress(0)
          return
        }
        
        if (!fullDetection || !fullDetection.descriptor || fullDetection.descriptor.length === 0) {
          console.error('❌ Descriptor inválido ou vazio')
          alert('Não foi possível processar o rosto. Tente:\n- Melhorar a iluminação\n- Olhar diretamente para a câmera\n- Ficar mais próximo da câmera')
          setIsProcessing(false)
          setProgress(0)
          return
        }
        
        console.log('✅ Descriptor válido! Prosseguindo...')

        setProgress(75)
        setStatus('Convertendo dados...')
        
        const descriptor = fullDetection.descriptor
        const embeddingBase64 = float32ToBase64(Array.from(descriptor))
        
        console.log('✅ Dados convertidos! Tamanho base64:', embeddingBase64.length)
        
        setProgress(80)
        setStatus('Preparando para salvar...')

        // Usar pendingUser se existir (vem do login ou registro), senão usar currentUser
        // Priorizar pendingUser porque ele é mais confiável (vem diretamente do login/registro)
        const userToUse = pendingUser || currentUser
        const userId = userToUse?.id
        const email = userToUse?.email
        // Só é registro se tem pendingUser mas não tem currentUser (usuário novo)
        const isRegistering = !!pendingUser && !currentUser

        if (!userId || !email) {
          console.error('Dados do usuário não encontrados:', { 
            pendingUser: pendingUser ? { id: pendingUser.id, email: pendingUser.email } : null,
            currentUser: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
            userToUse: userToUse ? { id: userToUse.id, email: userToUse.email } : null
          })
          alert('Erro: Dados de usuário não encontrados. Por favor, faça login novamente.')
          setIsProcessing(false)
          setProgress(0)
          return
        }
        
        console.log('✅ Usando dados do usuário:', { userId, email, isRegistering, hasPendingUser: !!pendingUser, hasCurrentUser: !!currentUser })

        try {
          setStatus('Salvando no servidor...')
          
          if (isRegistering) {
            // Salvar rosto no cadastro
            setProgress(85)
            setStatus('Enviando para o servidor...')
            
            console.log('Enviando rosto para:', `${API_BASE_URL}/users/${userId}/face`)
            console.log('Tamanho do embedding base64:', embeddingBase64.length)
            console.log('User ID:', userId)
            
            if (!userId) {
              throw new Error('ID do usuário não encontrado. Por favor, faça o registro novamente.')
            }
            
            if (!embeddingBase64 || embeddingBase64.length === 0) {
              throw new Error('Embedding facial vazio. Tente capturar o rosto novamente.')
            }
            
            const response = await fetch(`${API_BASE_URL}/users/${userId}/face`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ faceEmbedding: embeddingBase64 })
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.error('Erro do servidor:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
              })
              
              let errorMessage = 'Erro ao salvar rosto no servidor'
              if (errorText) {
                try {
                  const errorJson = JSON.parse(errorText)
                  errorMessage = errorJson.message || errorText
                } catch {
                  errorMessage = errorText
                }
              }
              
              // Mensagens mais específicas baseadas no status
              if (response.status === 401 || response.status === 403) {
                errorMessage = 'Acesso negado. Por favor, faça o registro novamente.'
              } else if (response.status === 404) {
                errorMessage = 'Usuário não encontrado. Por favor, faça o registro novamente.'
              } else if (response.status === 400) {
                errorMessage = errorMessage || 'Dados inválidos. Tente capturar o rosto novamente.'
              }
              
              throw new Error(errorMessage)
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

