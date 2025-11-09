// Obter país a partir de coordenadas
export async function getCountryFromCoordinates(lat, lon) {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`
    )
    const data = await response.json()
    return data.countryCode || 'US'
  } catch (error) {
    console.error('Erro ao obter país:', error)
    return 'US'
  }
}

// Mapa de países para moedas
export const currencyMap = {
  'BR': 'BRL',
  'US': 'USD',
  'CA': 'CAD',
  'GB': 'GBP',
  'DE': 'EUR',
  'FR': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'PT': 'EUR',
  'AU': 'AUD',
  'JP': 'JPY',
  'CN': 'CNY',
  'IN': 'INR',
  'MX': 'MXN',
  'AR': 'ARS',
  'CL': 'CLP',
  'CO': 'COP',
}

// Solicitar localização e determinar moeda
export async function requestLocationAndGetCurrency() {
  try {
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: false
      })
    })

    const countryCode = await getCountryFromCoordinates(
      position.coords.latitude,
      position.coords.longitude
    )

    return currencyMap[countryCode] || 'USD'
  } catch (error) {
    console.error('Erro ao obter localização:', error)
    // Retornar moeda padrão
    return 'USD'
  }
}

// Obter taxa de câmbio
export async function getExchangeRate(from, to) {
  if (from === to) return 1
  
  try {
    // Usar API de conversão gratuita
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    )
    const data = await response.json()
    return data.rates[to] || 1
  } catch (error) {
    console.error('Erro ao obter taxa de câmbio:', error)
    return 1
  }
}

// Formatar moeda
export function formatCurrency(value, currency = 'USD') {
  let locale = 'en-US';
  switch (currency.toUpperCase()) {
    case 'BRL': locale = 'pt-BR'; break;
    case 'USD': locale = 'en-US'; break;
    case 'EUR': locale = 'de-DE'; break;
    case 'GBP': locale = 'en-GB'; break;
    case 'JPY': locale = 'ja-JP'; break;
    default: locale = currency;
  }
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(Number(value))
}

