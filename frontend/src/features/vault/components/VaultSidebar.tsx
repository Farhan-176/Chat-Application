import React from 'react';
import { useVaultIdentity } from '../../../core/app/VaultIdentityContext';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
}

export const VaultSidebar: React.FC<{ activeContactId?: string; onSelectContact: (id: string) => void }> = ({ activeContactId, onSelectContact }) => {
  const { privateContacts } = useVaultIdentity();

  // For demonstration if contacts are empty
  const demoContacts: Contact[] = [
    { id: '1', name: 'Alice Smith', lastMessage: 'See you at 5!', timestamp: '10:45 AM' },
    { id: '2', name: 'Bob Wilson', lastMessage: 'The document is ready.', timestamp: 'Yesterday' },
  ];

  const contacts = privateContacts.length > 0 ? privateContacts : demoContacts;

  return (
    <div className="vault-contact-list">
      {contacts.map((contact) => (
        <div 
          key={contact.id} 
          className={`contact-item ${activeContactId === contact.id ? 'active' : ''}`}
          onClick={() => onSelectContact(contact.id)}
        >
          <div className="contact-avatar">
            {contact.name.charAt(0)}
          </div>
          <div className="contact-info">
            <div className="contact-name">{contact.name}</div>
            <div className="contact-last-msg">{contact.lastMessage}</div>
          </div>
          <div className="contact-meta">
            {contact.timestamp}
          </div>
        </div>
      ))}
    </div>
  );

};
