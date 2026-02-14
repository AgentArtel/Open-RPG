import React, { useState } from 'react';
import { CredentialCard } from '@/components/credentials/CredentialCard';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Key } from 'lucide-react';
import { Modal } from '@/components/ui-custom/Modal';

const mockCredentials = [
  { id: '1', name: 'OpenAI Production', service: 'openai', maskedValue: 'sk-proj-abc123xyz789', lastUsed: '2 hours ago' },
  { id: '2', name: 'Slack Bot Token', service: 'slack', maskedValue: 'xoxb-1234567890-abcdefghij', lastUsed: '1 day ago' },
  { id: '3', name: 'GitHub PAT', service: 'github', maskedValue: 'ghp_abcdefghijklmnopqrstuvwxyz', lastUsed: '3 days ago' },
  { id: '4', name: 'Stripe Test Key', service: 'stripe', maskedValue: 'sk_test_abcdefghijklmnopqrstuvwxyz', lastUsed: '1 week ago' },
];

export const Credentials: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredCredentials = mockCredentials.filter(cred =>
    cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Credentials</h1>
          <p className="text-white/50 mt-1">Manage your API keys and service connections</p>
        </div>
        <Button 
          className="bg-green text-dark hover:bg-green-light"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Credential
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search credentials..."
          className="max-w-md"
        />
      </div>

      {/* Credentials Grid */}
      {filteredCredentials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              id={credential.id}
              name={credential.name}
              type={credential.service}
              isConnected={true}
              lastUsed={credential.lastUsed}
              onEdit={() => console.log('Edit', credential.id)}
              onDelete={() => console.log('Delete', credential.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No credentials found"
          description="Add your first API key to connect with external services"
          icon={<Key className="w-8 h-8" />}
          actionLabel="Add Credential"
          onAction={() => setIsAddModalOpen(true)}
        />
      )}

      {/* Add Credential Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Credential"
        description="Add a new API key or service connection"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Name</label>
            <input
              type="text"
              placeholder="e.g., OpenAI Production"
              className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Service</label>
            <select className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-green/50">
              <option value="">Select a service</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="slack">Slack</option>
              <option value="github">GitHub</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">API Key</label>
            <input
              type="password"
              placeholder="Enter your API key"
              className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-green text-dark hover:bg-green-light">
              Add Credential
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
