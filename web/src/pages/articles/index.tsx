'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Calendar, FileText } from 'lucide-react'
import { useRouter } from 'next/router'
import { Search } from 'lucide-react'

export default function Articles() {
  const router = useRouter()
  const [articles, setArticles] = useState<any[]>([])
  const [filteredArticles, setFilteredArticles] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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
        setFilteredArticles([])
        setLoading(false)
        return
      }
      
      const data = await response.json()
      const articlesData = Array.isArray(data) ? data : []
      setArticles(articlesData)
      setFilteredArticles(articlesData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch articles:', error)
      setArticles([])
      setFilteredArticles([])
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredArticles(articles)
      return
    }
    
    const filtered = articles.filter(article => 
      article.title.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredArticles(filtered)
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
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif text-[#2c2416] mb-1">Generated Articles</h1>
              <p className="text-sm text-[#8b7355]">
                AI-generated comprehensive articles from your knowledge base
              </p>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <button
                onClick={() => router.push('/topics')}
                className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-white border border-[#8b7355] text-[#8b7355] rounded hover:bg-[#f5f1e8] transition-colors"
              >
                Topics
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-[#8b7355] text-white rounded hover:bg-[#2c2416] transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8b7355]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#d4c5a9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b7355] focus:border-transparent"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-[#8b7355] mt-2">
              Found {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#8b7355] text-lg">Loading articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-[#d4c5a9] mx-auto mb-4" />
            <p className="text-[#8b7355] text-lg mb-2">
              {searchQuery ? 'No articles found' : 'No articles generated yet'}
            </p>
            <p className="text-[#8b7355] text-sm">
              {searchQuery ? 'Try a different search term' : 'Upload documents with 5+ related concepts to auto-generate articles'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
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
