import { cn } from '@/lib/utils';
import { useState } from 'react';
import { X, Key, Check } from 'lucide-react';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';

interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  placeholder?: string;
  helperText?: string;
}

interface CredentialType {
  id: string;
  name: string;
  icon: string;
  fields: CredentialField[];
}

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { type: string; name: string; values: Record<string, string> }) => void;
  credentialTypes: CredentialType[];
  editingCredential?: {
    id: string;
    name: string;
    type: string;
    values: Record<string, string>;
  } | null;
  className?: string;
}

export const CredentialModal: React.FC<CredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  credentialTypes,
  editingCredential,
  className = '',
}) => {
  const [selectedType, setSelectedType] = useState(credentialTypes[0]?.id || '');
  const [name, setName] = useState(editingCredential?.name || '');
  const [values, setValues] = useState<Record<string, string>>(editingCredential?.values || {});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const credentialType = credentialTypes.find(t => t.id === selectedType);

  const handleSave = () => {
    onSave({
      type: selectedType,
      name: name || credentialType?.name || 'New Credential',
      values,
    });
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResult(Math.random() > 0.3 ? 'success' : 'error');
    setIsTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={cn(
          'relative w-full max-w-lg bg-dark-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden',
          'animate-scale-in',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editingCredential ? 'Edit Credential' : 'Add Credential'}
              </h2>
              <p className="text-sm text-white/50">Connect to external services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Credential Type */}
          {!editingCredential && (
            <FormSelect
              label="Credential Type"
              value={selectedType}
              options={credentialTypes.map(t => ({
                value: t.id,
                label: t.name,
              }))}
              onChange={setSelectedType}
            />
          )}

          {/* Credential Name */}
          <FormInput
            label="Credential Name"
            value={name}
            onChange={setName}
            placeholder="e.g., My OpenAI Account"
          />

          {/* Dynamic Fields */}
          {credentialType?.fields.map((field) => (
            <FormInput
              key={field.key}
              label={field.label}
              value={values[field.key] || ''}
              onChange={(val) => setValues(prev => ({ ...prev, [field.key]: val }))}
              type={field.type}
              placeholder={field.placeholder}
              helperText={field.helperText}
            />
          ))}

          {/* Test Result */}
          {testResult && (
            <div className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl',
              testResult === 'success' ? 'bg-green/10' : 'bg-danger/10'
            )}>
              <Check className={cn(
                'w-4 h-4',
                testResult === 'success' ? 'text-green' : 'text-danger'
              )} />
              <span className={cn(
                'text-sm',
                testResult === 'success' ? 'text-green' : 'text-danger'
              )}>
                {testResult === 'success' ? 'Connection successful!' : 'Connection failed. Please check your credentials.'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-dark-200/30">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Test Connection
              </>
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-xl text-sm bg-green text-dark font-medium hover:bg-green/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
