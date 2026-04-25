import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { translateMessage, getCachedTranslation, cacheTranslation, COMMON_LANGUAGES } from '../utils/translationUtils';
import './TranslateButton.css';

interface TranslateButtonProps {
  messageId: string;
  messageText: string;
  targetLanguage?: string;
  onTranslationComplete?: (translation: string) => void;
}

/**
 * Translate button for individual messages
 * Shows on hover, triggers translation modal
 */
export const TranslateButton: React.FC<TranslateButtonProps> = ({
  messageId,
  messageText,
  targetLanguage = 'Spanish',
  onTranslationComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(targetLanguage);

  const handleTranslate = async (language: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first
      let result = getCachedTranslation(messageId, language);
      
      if (!result) {
        // Translate and cache
        result = await translateMessage(messageText, language);
        cacheTranslation(messageId, language, result, messageText);
      }
      
      setTranslation(result);
      setSelectedLanguage(language);
      onTranslationComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      console.error('Translation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="translate-button-wrapper">
      <button
        className="translate-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Translate message"
        aria-label="Translate"
      >
        <Globe size={16} />
        Translate
      </button>

      {isOpen && (
        <div className="translate-dropdown">
          <div className="translate-dropdown-header">
            <span>Translate to:</span>
            <button
              className="translate-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {translation ? (
            // Show translation
            <div className="translation-result">
              <div className="translation-original">
                <span className="label">Original ({targetLanguage})</span>
                <p className="text">{messageText}</p>
              </div>

              <div className="translation-arrow">↓</div>

              <div className="translation-translated">
                <span className="label">Translated ({selectedLanguage})</span>
                <p className="text">{translation}</p>
              </div>

              <button
                className="translate-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(translation);
                  alert('Translation copied to clipboard');
                }}
              >
                Copy Translation
              </button>

              <button
                className="translate-again-btn"
                onClick={() => {
                  setTranslation(null);
                  setSelectedLanguage(targetLanguage);
                }}
              >
                Translate to Different Language
              </button>
            </div>
          ) : (
            // Show language buttons
            <div className="language-buttons">
              {COMMON_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-btn ${selectedLanguage === lang.name ? 'active' : ''} ${isLoading ? 'disabled' : ''}`}
                  onClick={() => handleTranslate(lang.name)}
                  disabled={isLoading}
                >
                  {isLoading && selectedLanguage === lang.name ? (
                    <>
                      <Loader2 size={14} className="spinner" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <span className="emoji">{lang.emoji}</span>
                      <span className="name">{lang.name}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="translate-error">
              ⚠️ {error}
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranslateButton;
