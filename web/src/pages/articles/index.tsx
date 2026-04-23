'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Calendar, FileText } from 'lucide-react'
import { useRouter } from 'next/router'

export default function Articles() {
  const router = useRouter()
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kb-api.tomtom79.tech'

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/articles`)
      
      if (!response.ok) {
        console.error('Failed to fetch articles:', response.status)
        setArticles([])
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setArticles(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch articles:', error)
      setArticles([])
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSlugFromFilename = (filename: string) => {
    return filename.replace('.md', '')
  }

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      {/* Header */}
      <div className="bg-white border-b border-[#d4c5a9]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-serif text-[#2c2416] mb-2">Generated Articles</h1>
              <p className="text-[#8b7355]">
                AI-generated comprehensive articles from your knowledge base
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/topics')}
                className="px-4 py-2 bg-white border border-[#8b7355] text-[#8b7355] rounded hover:bg-[#f5f1e8] transition-colors"
              >
                View Topics
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-[#8b7355] text-white rounded hover:bg-[#2c2416] transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#8b7355] text-lg">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-[#d4c5a9] mx-auto mb-4" />
            <p className="text-[#8b7355] text-lg mb-2">No articles generated yet</p>
            <p className="text-[#8b7355] text-sm">Upload documents with 5+ related concepts to auto-generate articles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg border border-[#d4c5a9] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/articles/${getSlugFromFilename(article.filename)}`)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <BookOpen className="w-6 h-6 text-[#8b7355] flex-shrink-0 mt-1" />
                    <h2 className="text-xl font-serif text-[#2c2416] leading-tight">
                      {article.title}
                    </h2>
                  </div>
                  
                  <div className="space-y-2 text-sm text-[#8b7355]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{article.concepts} concepts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(article.generated)}</span>
                    </div>
                  </div>

                  <button className="mt-4 w-full px-4 py-2 bg-[#f5f1e8] text-[#8b7355] rounded hover:bg-[#d4c5a9] transition-colors">
                    Read Article
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
