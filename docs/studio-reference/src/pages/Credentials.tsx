import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CredentialCard } from '@/components/credentials/CredentialCard';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Key } from 'lucide-react';
import { Modal } from '@/components/ui-custom/Modal';

const initialCredentials = [
  { id: '1', name: 'OpenAI Production', service: 'openai', maskedValue: 'sk-proj-abc123xyz789', lastUsed: '2 hours ago' },
  { id: '2', name: 'Slack Bot Token', service: 'slack', maskedValue: 'xoxb-1234567890-abcdefghij', lastUsed: '1 day ago' },
  { id: '3', name: 'GitHub PAT', service: 'github', maskedValue: 'ghp_abcdefghijklmnopqrstuvwxyz', lastUsed: '3 days ago' },
  { id: '4', name: 'Stripe Test Key', service: 'stripe', maskedValue: 'sk_test_abcdefghijklmnopqrstuvwxyz', lastUsed: '1 week ago' },
];

interface CredentialsProps {
  onNavigate: (page: string) => void;
}

export const Credentials: React.FC<CredentialsProps> = ({ onNavigate }) => {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<{ id: string; name: string; service: string } | null>(null);
  const [formName, setFormName] = useState('');
  const [formService, setFormService] = useState('');
  const [formApiKey, setFormApiKey] = useState('');

  const openAddModal = useCallback(() => {
    setEditingCredential(null);
    setFormName('');
    setFormService('');
    setFormApiKey('');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((cred: { id: string; name: string; service: string }) => {
    setEditingCredential(cred);
    setFormName(cred.name);
    setFormService(cred.service);
    setFormApiKey('');
    setIsModalOpen(true);
  }, []);

  const handleSaveCredential = useCallback(() => {
    if (!formName.trim() || !formService) {
      toast.error('Name and service are required');
      return;
    }
    if (editingCredential) {
      setCredentials(prev => prev.map(c => c.id === editingCredential.id ? { ...c, name: formName.trim(), service: formService } : c));
      toast.success('Credential updated');
    } else {
      setCredentials(prev => [...prev, { id: String(Date.now()), name: formName.trim(), service: formService, maskedValue: '••••••••', lastUsed: 'Just now' }]);
      toast.success('Credential added');
    }
    setIsModalOpen(false);
    setEditingCredential(null);
    setFormName('');
    setFormService('');
    setFormApiKey('');
  }, [editingCredential, formName, formService]);

  const handleDeleteCredential = useCallback((id: string) => {
    if (!window.confirm('Delete this credential? This cannot be undone.')) return;
    setCredentials(prev => prev.filter(c => c.id !== id));
    toast.success('Credential deleted');
  }, []);

  const handleTestConnection = useCallback(() => {
    toast.loading('Testing connection...');
    setTimeout(() => {
      toast.dismiss();
      toast.success('Connection successful');
    }, 1200);
  }, []);

  const filteredCredentials = credentials.filter(cred =>
    cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Credentials</h1>
          <p className="text-white/50 mt-1">Manage your API keys and service connections</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" /> Add Credential
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search credentials..." className="max-w-md" />
      </div>

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
              onEdit={() => openEditModal(credential)}
              onDelete={() => handleDeleteCredential(credential.id)}
              onTest={handleTestConnection}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No credentials found" description="Add your first API key to connect with external services" icon={<Key className="w-8 h-8" />} actionLabel="Add Credential" onAction={openAddModal} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingCredential(null); }} title={editingCredential ? 'Edit Credential' : 'Add Credential'} description={editingCredential ? 'Update your API key or service connection' : 'Add a new API key or service connection'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., OpenAI Production" className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Service</label>
            <select value={formService} onChange={(e) => setFormService(e.target.value)} className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-green/50">
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
            <input type="password" value={formApiKey} onChange={(e) => setFormApiKey(e.target.value)} placeholder={editingCredential ? 'Leave blank to keep current' : 'Enter your API key'} className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { setIsModalOpen(false); setEditingCredential(null); }}>Cancel</Button>
            <Button className="bg-green text-dark hover:bg-green-light" onClick={handleSaveCredential}>{editingCredential ? 'Save' : 'Add Credential'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
