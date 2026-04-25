import { useState } from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'

interface AIIntelligenceProps {
  roomId: string
  messageText?: string
  onAnalysisComplete?: (analysis: any) => void
}

export const AIIntelligence = ({
  roomId,
  messageText,
  onAnalysisComplete,
}: AIIntelligenceProps) => {
  const [analysis, setAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeMessage = async () => {
    if (!messageText) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          roomId,
          senderRole: 'member',
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      setAnalysis(result.analysis)
      onAnalysisComplete?.(result.analysis)
    } catch (err) {
      console.error('AI analysis failed:', err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div style={{ padding: '12px', background: 'rgba(79, 140, 255, 0.08)', borderRadius: '8px', border: '1px solid rgba(79, 140, 255, 0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Sparkles size={14} style={{ color: '#1f5fff' }} />
        <span style={{ fontSize: '12px', color: '#d4e6ff', fontWeight: '700' }}>AI Intelligence</span>
      </div>

      {!analysis && (
        <button
          onClick={analyzeMessage}
          disabled={isAnalyzing || !messageText}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            background: 'rgba(31, 95, 255, 0.2)',
            color: '#d4e6ff',
            border: '1px solid rgba(31, 95, 255, 0.4)',
            borderRadius: '6px',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Message'}
        </button>
      )}

      {analysis && (
        <div style={{ fontSize: '11px', color: '#a8b7cd' }}>
          <div style={{ marginBottom: '6px' }}>
            <strong>Priority:</strong> {analysis.priority}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <strong>Category:</strong> {analysis.category}
          </div>
          {analysis.moderationRisk > 0.5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px', background: 'rgba(220, 38, 38, 0.15)', borderRadius: '4px', color: '#fca5a5', marginTop: '6px' }}>
              <AlertCircle size={12} />
              <span>Moderation attention needed</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(220, 38, 38, 0.15)', borderRadius: '4px', color: '#fca5a5', fontSize: '11px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
