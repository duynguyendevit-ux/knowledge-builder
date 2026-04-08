'use client'

import { useState } from 'react'
import { Brain, Lock } from 'lucide-react'

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kb-api.tomtom79.tech'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('kb_token', data.token)
        }
        onLogin(data.token)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf5ee] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c2652a] rounded-full mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#2d2520] mb-2" style={{ fontFamily: 'EB Garamond, serif' }}>
            Knowledge Builder
          </h1>
          <p className="text-[#8b7355]">Secure access required</p>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-[#e8dcc8] rounded-lg p-8 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2d2520] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8b7355]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#e8dcc8] rounded-lg focus:outline-none focus:border-[#c2652a] text-[#2d2520]"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c2652a] text-white py-3 rounded-lg font-semibold hover:bg-[#a85424] disabled:bg-[#b8a490] disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#b8a490] mt-6">
          Your data is encrypted and secure
        </p>
      </div>
    </div>
  )
}
