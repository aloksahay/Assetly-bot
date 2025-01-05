const ZERION_API_KEY = process.env.ZERION_API_KEY!

export class ZerionService {
  private baseUrl = 'https://api.zerion.io/v1'
  private headers = {
    'accept': 'application/json',
    'authorization': `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
    'X-Env': 'testnet'
  }

  async getWalletPositions(address: string) {
    try {
      // Log request details for debugging
      console.log('Requesting positions for address:', address)
      console.log('Using headers:', this.headers)

      // Ensure the address is in lowercase
      const formattedAddress = address.toLowerCase()

      // Match exact URL structure from curl command
      const url = new URL(`${this.baseUrl}/wallets/${formattedAddress}/positions/`)
      url.searchParams.append('filter[positions]', 'only_simple')
      url.searchParams.append('currency', 'usd')
      url.searchParams.append('filter[trash]', 'no_filter')
      url.searchParams.append('sort', 'value')

      // Log full URL
      console.log('Request URL:', url.toString())

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers
      })

      // Log raw response for debugging
      const rawText = await response.text()
      console.log('Raw response:', rawText)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${rawText}`)
      }

      // Try parsing the response text
      let data
      try {
        data = JSON.parse(rawText)
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Invalid response format from Zerion API')
      }

      // Log parsed data
      console.log('Parsed response:', data)
      return data

    } catch (error) {
      console.error('Zerion request failed:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch wallet positions')
    }
  }
} 