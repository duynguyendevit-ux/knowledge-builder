'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Calendar, FileText, X } from 'lucide-react'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Articles() {
  const router = useRouter()
  const [articles, setArticles] = useState<any[]>([])
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [articleContent, setArticleContent] = useState<string>('')
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

  const loadArticle = async (filename: string) => {
    try {
      const response = await fetch(`${API_URL}/api/articles/${filename}`)
      const data = await response.json()
      setArticleContent(data.content)
      setSelectedArticle(filename)
    } catch (error) {
      console.error('Failed to load article:', error)
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
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[#8b7355] text-white rounded hover:bg-[#2c2416] transition-colors"
            >
              Back to Home
            </button>
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
                onClick={() => loadArticle(article.filename)}
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

      {/* Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#d4c5a9] flex items-center justify-between">
              <h2 className="text-2xl font-serif text-[#2c2416]">Article</h2>
              <button
                onClick={() => {
                  setSelectedArticle(null)
                  setArticleContent('')
                }}
                className="text-[#8b7355] hover:text-[#2c2416] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-white">
              <div className="
                [&_h1]:text-3xl [&_h1]:font-serif [&_h1]:text-[#2c2416] [&_h1]:mb-4
                [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:text-[#2c2416] [&_h2]:mt-8 [&_h2]:mb-4
                [&_h3]:text-xl [&_h3]:font-serif [&_h3]:text-[#2c2416] [&_h3]:mt-6 [&_h3]:mb-3
                [&_p]:text-[#4a4a4a] [&_p]:leading-relaxed [&_p]:mb-4
                [&_strong]:text-[#2c2416] [&_strong]:font-semibold
                [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4
                [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4
                [&_li]:text-[#4a4a4a] [&_li]:mb-2
                [&_code]:bg-[#f5f1e8] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:text-[#2c2416]
                [&_pre]:bg-[#2c2416] [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:mb-4
                [&_a]:text-[#8b7355] [&_a]:underline hover:[&_a]:text-[#2c2416]
                [&_blockquote]:border-l-4 [&_blockquote]:border-[#d4c5a9] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#4a4a4a]
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {articleContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
