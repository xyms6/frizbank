import { useState, useEffect } from 'react'

export function useCrypto(currency = 'USD') {
  const [cryptoData, setCryptoData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCryptoData = async () => {
    try {
      setLoading(true)
      // API CoinGecko para buscar criptomoedas
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'
      )
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados de criptomoedas')
      }
      
      const data = await response.json()
      setCryptoData(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar criptomoedas:', err)
      setError(err.message)
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

