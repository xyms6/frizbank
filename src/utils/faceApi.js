import * as faceapi from 'face-api.js'

// Verificar se os modelos estão carregados
export function areModelsLoaded() {
  try {
    return faceapi.nets.tinyFaceDetector.isLoaded
  } catch (error) {
    return false
  }
}

// Carregar modelos do Face API (usando modelos locais)
export async function loadFaceModels() {
  // Verificar se já estão carregados
  if (areModelsLoaded()) {
    console.log('✅ Modelos já estão carregados')
    return true
  }
  
  try {
    console.log('Carregando modelos faciais de /models...')
    
    // Carregar apenas o TinyFaceDetector dos modelos locais
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
    console.log('✅ Modelos faciais carregados!')
    
    return true
  } catch (error) {
    console.error('Erro ao carregar modelos:', error)
    return false
  }
}
