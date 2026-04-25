import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { generateAITags } from '../utils/vaultUtils';
import './StarButton.css';

interface StarButtonProps {
  messageId: string;
  messageText: string;
  isSaved: boolean;
  onSave: (tags: string[], aiTags: string[]) => void;
  onRemove: () => void;
}

/**
 * Star button for saving messages to vault
 * Shows on hover, generates AI tags on save
 */
export const StarButton: React.FC<StarButtonProps> = ({
  messageText,
  isSaved,
  onSave,
  onRemove
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStarClick = async () => {
    if (isSaved) {
      // Remove from vault
      onRemove();
      return;
    }

    // Save to vault with AI tags
    setIsLoading(true);
    setError(null);

    try {
      // Generate AI tags
      const aiTags = await generateAITags(messageText);
      
      // Call onSave with generated tags
      onSave([], aiTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tags');
      console.error('Star error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="star-button-wrapper">
      <button
        className={`star-button ${isSaved ? 'saved' : ''} ${isLoading ? 'loading' : ''}`}
        onClick={handleStarClick}
        disabled={isLoading}
        title={isSaved ? 'Remove from vault' : 'Save to vault'}
        aria-label={isSaved ? 'Remove from vault' : 'Save to vault'}
      >
        {isLoading ? (
          <Loader2 size={16} className="spinner" />
        ) : (
          <Star size={16} fill={isSaved ? 'currentColor' : 'none'} />
        )}
      </button>

      {error && (
        <div className="star-error-tooltip">
          ⚠️ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {isSaved && (
        <div className="star-saved-indicator">
          Saved to vault
        </div>
      )}
    </div>
  );
};

export default StarButton;
