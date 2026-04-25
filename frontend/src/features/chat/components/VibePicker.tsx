import { useState } from 'react'
import { VIBE_CONFIGS, type VibeType } from '../utils/vibeUtils'
import './VibePicker.css'

interface VibePickerProps {
  selectedVibe?: VibeType
  onVibeSelect: (vibe: VibeType) => void
  showPreview?: boolean
}

export const VibePicker = ({ selectedVibe = 'default', onVibeSelect, showPreview = true }: VibePickerProps) => {
  const [hoveredVibe, setHoveredVibe] = useState<VibeType | null>(null)

  // Color palette preview for each vibe
  const vibeColorPalettes: Record<VibeType, { primary: string; accent: string; secondary: string }> = {
    default: { primary: '#1f2937', accent: '#3b82f6', secondary: '#e5e7eb' },
    lofi: { primary: '#4c1d95', accent: '#c4b5fd', secondary: '#e9d5ff' },
    hype: { primary: '#0369a1', accent: '#06b6d4', secondary: '#e0f2fe' },
    focus: { primary: '#1a1a1a', accent: '#fbbf24', secondary: '#2d2d2d' },
    chill: { primary: '#15803d', accent: '#4ade80', secondary: '#dcfce7' },
    midnight: { primary: '#0f0d27', accent: '#a78bfa', secondary: '#27205f' },
  }

  return (
    <div className="vibe-picker">
      <div className="vibe-grid">
        {VIBE_CONFIGS.map((vibe) => {
          const palette = vibeColorPalettes[vibe.id]
          const isSelected = selectedVibe === vibe.id
          const isHovered = hoveredVibe === vibe.id

          return (
            <div
              key={vibe.id}
              className={`vibe-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => onVibeSelect(vibe.id)}
              onMouseEnter={() => setHoveredVibe(vibe.id)}
              onMouseLeave={() => setHoveredVibe(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onVibeSelect(vibe.id)
                }
              }}
            >
              {/* Color Preview Strips */}
              {showPreview && (
                <div className="vibe-preview">
                  <div
                    className="preview-stripe"
                    style={{ backgroundColor: palette.primary }}
                    title="Primary color"
                  />
                  <div
                    className="preview-stripe"
                    style={{ backgroundColor: palette.accent }}
                    title="Accent color"
                  />
                  <div
                    className="preview-stripe"
                    style={{ backgroundColor: palette.secondary }}
                    title="Secondary color"
                  />
                </div>
              )}

              {/* Vibe Content */}
              <div className="vibe-content">
                <div className="vibe-emoji">{vibe.emoji}</div>
                <h3 className="vibe-label">{vibe.label}</h3>
                <p className="vibe-description">{vibe.description}</p>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="selection-checkmark">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M3 10l5 5 9-9" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Vibe Info */}
      {selectedVibe && (
        <div className="vibe-info">
          <div className="info-label">Selected: {VIBE_CONFIGS.find((v) => v.id === selectedVibe)?.label}</div>
        </div>
      )}
    </div>
  )
}
