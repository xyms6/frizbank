import * as faceapi from 'face-api.js'

// Verificar se os modelos estão carregados
export function areModelsLoaded() {
  try {
    return faceapi.nets.tinyFaceDetector.isLoaded
  } catch (error) {
    return false
  }
}

// Carregar modelos do Face API com múltiplos fallbacks
export async function loadFaceModels() {
  // Verificar se já estão carregados
  if (areModelsLoaded()) {
    console.log('✅ Modelos já estão carregados')
    return true
  }
  
  // Lista de fontes para tentar (CDN como garantia)
  const modelSources = [
    // Opção 1: CDN jsdelivr (mais confiável)
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
    // Opção 2: CDN unpkg
    'https://unpkg.com/face-api.js@0.22.2/weights',
    // Opção 3: CDN GitHub
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
    // Opção 4: Local (se existir)
    '/models'
  ]
  
  for (const source of modelSources) {
    try {
      console.log(`Tentando carregar modelos de: ${source}`)
      
      // Carregar TinyFaceDetector (mais leve e rápido)
      await faceapi.nets.tinyFaceDetector.loadFromUri(source)
      
      // Verificar se carregou
      if (areModelsLoaded()) {
        console.log(`✅ Modelos carregados com sucesso de: ${source}`)
        return true
      }
    } catch (error) {
      console.warn(`Falha ao carregar de ${source}:`, error.message)
      // Continuar para próxima fonte
      continue
    }
  }
  
  // Se nenhuma fonte funcionou, tentar uma última vez com timeout maior
  try {
    console.log('Tentativa final com CDN principal...')
    await Promise.race([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
    ])
    
    if (areModelsLoaded()) {
      console.log('✅ Modelos carregados na tentativa final!')
      return true
    }
  } catch (error) {
    console.error('Erro na tentativa final:', error)
  }
  
  console.error('❌ Não foi possível carregar modelos de nenhuma fonte')
  return false
}
