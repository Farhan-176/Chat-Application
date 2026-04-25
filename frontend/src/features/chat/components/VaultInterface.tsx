import React, { useState, useMemo } from 'react';
import { Search, Grid3x3, List, Tag, Trash2, ChevronLeft } from 'lucide-react';
import { VaultMessage, getAllTags, searchVault, filterByTags, sortBySavedDate } from '../utils/vaultUtils';
import './VaultInterface.css';

interface VaultInterfaceProps {
  vaultMessages: VaultMessage[];
  onClose: () => void;
  onDeleteMessage: (messageId: string) => void;
}

/**
 * Vault interface for viewing and managing saved messages
 */
export const VaultInterface: React.FC<VaultInterfaceProps> = ({
  vaultMessages,
  onClose,
  onDeleteMessage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const allTags = useMemo(() => getAllTags(vaultMessages), [vaultMessages]);

  const filteredMessages = useMemo(() => {
    let results = vaultMessages;

    // Search
    if (searchQuery.trim()) {
      results = searchVault(searchQuery, results);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      results = filterByTags(selectedTags, results);
    }

    // Sort by saved date
    return sortBySavedDate(results, 'desc');
  }, [vaultMessages, searchQuery, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="vault-interface">
      {/* Header */}
      <div className="vault-header">
        <button className="vault-back-btn" onClick={onClose} aria-label="Close vault">
          <ChevronLeft size={20} />
          Back
        </button>
        <h1 className="vault-title">Message Vault</h1>
        <div className="vault-stats">
          {filteredMessages.length} of {vaultMessages.length} saved
        </div>
      </div>

      {/* Search & Controls */}
      <div className="vault-controls">
        <div className="vault-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search saved messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="vault-search-input"
          />
          {searchQuery && (
            <button
              className="vault-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="vault-view-modes">
          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <Grid3x3 size={16} />
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="vault-tags-filter">
          <div className="tags-label">
            <Tag size={14} />
            Filter by tags:
          </div>
          <div className="tags-list">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              className="tags-clear-btn"
              onClick={() => setSelectedTags([])}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className={`vault-messages vault-${viewMode}`}>
        {filteredMessages.length === 0 ? (
          <div className="vault-empty">
            <div className="vault-empty-icon">📭</div>
            <p className="vault-empty-title">No messages found</p>
            <p className="vault-empty-desc">
              {vaultMessages.length === 0
                ? 'Star messages to save them to your vault'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          filteredMessages.map(message => (
            <div
              key={message.messageId}
              className={`vault-message ${expandedMessage === message.messageId ? 'expanded' : ''}`}
            >
              {/* Message header */}
              <div className="vault-message-header">
                <div className="vault-message-sender">
                  <span className="sender-name">{message.senderName}</span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="vault-delete-btn"
                  onClick={() => onDeleteMessage(message.messageId)}
                  title="Delete from vault"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Message text */}
              <div className="vault-message-text">
                <p>
                  {message.text.length > 200 && expandedMessage !== message.messageId
                    ? `${message.text.substring(0, 200)}...`
                    : message.text}
                </p>
                {message.text.length > 200 && (
                  <button
                    className="vault-expand-btn"
                    onClick={() =>
                      setExpandedMessage(
                        expandedMessage === message.messageId ? null : message.messageId
                      )
                    }
                  >
                    {expandedMessage === message.messageId ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {/* Tags */}
              {(message.tags.length > 0 || (message.aiTags && message.aiTags.length > 0)) && (
                <div className="vault-message-tags">
                  {/* User tags */}
                  {message.tags.map(tag => (
                    <span key={tag} className="tag user-tag">
                      {tag}
                    </span>
                  ))}
                  {/* AI tags */}
                  {message.aiTags?.map(tag => (
                    <span key={tag} className="tag ai-tag" title="AI-generated">
                      ✨ {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {message.notes && (
                <div className="vault-message-notes">
                  <strong>Notes:</strong> {message.notes}
                </div>
              )}

              {/* Save timestamp */}
              <div className="vault-save-time">
                Saved {new Date(message.savedAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VaultInterface;
