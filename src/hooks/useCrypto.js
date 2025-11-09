import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config/api'

export function useCrypto(currency = 'USD') {
  const [cryptoData, setCryptoData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCryptoData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Buscar do backend (que faz proxy para CoinGecko)
      const vsCurrency = currency.toLowerCase()
      const response = await fetch(`${API_BASE_URL}/crypto/markets?vsCurrency=${vsCurrency}&perPage=10`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar criptomoedas')
      }
      
      const data = await response.json()
      setCryptoData(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCryptoData()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchCryptoData, 30000)
    
    return () => clearInterval(interval)
  }, [currency])

  return { cryptoData, loading, error, refetch: fetchCryptoData }
}

