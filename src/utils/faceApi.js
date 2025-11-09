// Aguardar Face API estar disponível
export async function waitForFaceAPI() {
  let attempts = 0
  const maxAttempts = 50
  
  while (typeof faceapi === 'undefined' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  if (typeof faceapi === 'undefined') {
    throw new Error('Face API não foi carregado. Verifique sua conexão com a internet.')
  }
  
  return true
}

// Carregar modelos do Face API
export async function loadFaceModels() {
  // Aguardar Face API estar disponível
  try {
    await waitForFaceAPI()
  } catch (error) {
    console.error('Erro ao aguardar Face API:', error)
    return false
  }
  
  // Tentar múltiplos CDNs em ordem de preferência
  const modelPaths = [
    // Opção 1: jsdelivr GitHub (mais confiável)
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
    // Opção 2: jsdelivr npm
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
    // Opção 3: unpkg
    'https://unpkg.com/face-api.js@0.22.2/weights',
    // Opção 4: GitHub raw (pode ter problemas de CORS)
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/0.22.2/weights'
  ]
  
  let loaded = false
  
  for (let i = 0; i < modelPaths.length && !loaded; i++) {
    try {
      console.log(`Tentando carregar modelos de: ${modelPaths[i]}`)
      
      // Carregar modelos em paralelo para ser mais rápido
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPaths[i]),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPaths[i]),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPaths[i])
      ])
      
      loaded = true
      console.log(`✅ Modelos carregados com sucesso de: ${modelPaths[i]}`)
    } catch (error) {
      console.warn(`Falha ao carregar de ${modelPaths[i]}:`, error.message)
      // Continuar para o próximo CDN
    }
  }
  
  if (!loaded) {
    console.error('❌ Não foi possível carregar modelos de nenhum CDN disponível.')
    return false
  }
  
  return true
}

