import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Catch and log client-side errors
    const handleError = (event: ErrorEvent) => {
      console.error('Client error:', event.error)
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError)
      return () => window.removeEventListener('error', handleError)
    }
  }, [])

  // Prevent SSR flash
  if (!mounted) {
    return null
  }

  return <Component {...pageProps} />
}
