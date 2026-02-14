/**
 * ============================================================================
 * IMPORT N8N MODAL
 * ============================================================================
 *
 * PURPOSE:
 * Two-phase modal for importing n8n workflow JSON into Agent Artel Studio.
 *
 * PHASE 1 — Source Selection:
 *   - File upload (click or drag-and-drop) for .json files
 *   - URL input for raw JSON URLs (GitHub raw, Gist, etc.)
 *   - Parses JSON, runs convertN8nWorkflow(), shows inline errors
 *
 * PHASE 2 — Missing Configuration (conditional):
 *   - Only shown if credentials or env vars are detected
 *   - Credential refs: dropdown to select from available credentials
 *   - Env vars: text inputs for each detected variable
 *   - "Import with Configuration" or "Import Anyway" actions
 *
 * DESIGN:
 * Uses existing Modal component with dark theme, green accents, and
 * glassmorphic styling consistent with the rest of the application.
 *
 * @author Open Agent Artel Team
 * @version 1.0.0
 * ============================================================================
 */

import React, { useState, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui-custom/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { convertN8nWorkflow } from '@/lib/n8nImporter';
import type { N8nImportResult, N8nWorkflowJSON } from '@/types';
import {
  Upload,
  Link,
  AlertCircle,
  FileJson,
  ChevronRight,
  KeyRound,
  Variable,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ImportN8nModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when import is complete. envVars is provided if user filled values. */
  onImportComplete: (result: N8nImportResult, envVars?: Record<string, string>) => void;
  /** Available credentials for the user to select from */
  availableCredentials: { id: string; name: string; service: string }[];
}

type Phase = 'source' | 'config';

// =============================================================================
// COMPONENT
// =============================================================================

export const ImportN8nModal: React.FC<ImportN8nModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  availableCredentials,
}) => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [phase, setPhase] = useState<Phase>('source');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [importResult, setImportResult] = useState<N8nImportResult | null>(null);

  // Missing config form state
  const [credentialSelections, setCredentialSelections] = useState<Record<string, string>>({});
  const [envVarValues, setEnvVarValues] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Reset state when modal closes
  // ---------------------------------------------------------------------------
  const handleClose = useCallback(() => {
    setPhase('source');
    setError(null);
    setIsLoading(false);
    setIsDragOver(false);
    setUrlValue('');
    setImportResult(null);
    setCredentialSelections({});
    setEnvVarValues({});
    onClose();
  }, [onClose]);

  // ---------------------------------------------------------------------------
  // Process parsed JSON through the converter
  // ---------------------------------------------------------------------------
  const processJson = useCallback((raw: unknown) => {
    setError(null);
    try {
      const result = convertN8nWorkflow(raw as N8nWorkflowJSON);

      // If there are missing configs, show phase 2
      if (result.missing.credentialRefs.length > 0 || result.missing.envVars.length > 0) {
        setImportResult(result);
        // Initialize env var values
        const initialEnvVars: Record<string, string> = {};
        for (const v of result.missing.envVars) {
          initialEnvVars[v] = '';
        }
        setEnvVarValues(initialEnvVars);
        setPhase('config');
      } else {
        // No missing config — import directly
        onImportComplete(result);
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse workflow.');
    }
  }, [onImportComplete, handleClose]);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------
  const handleFileRead = useCallback((file: File) => {
    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setIsLoading(false);
      try {
        const parsed = JSON.parse(e.target?.result as string);
        processJson(parsed);
      } catch {
        setError('Invalid JSON format. Please select an n8n workflow JSON file.');
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  }, [processJson]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileRead]);

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      handleFileRead(file);
    } else {
      setError('Please drop a .json file.');
    }
  }, [handleFileRead]);

  // ---------------------------------------------------------------------------
  // URL fetch
  // ---------------------------------------------------------------------------
  const handleFetchUrl = useCallback(async () => {
    if (!urlValue.trim()) return;
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(urlValue.trim());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = await response.json();
      processJson(parsed);
    } catch {
      setError('Could not fetch from this URL. Try downloading the JSON file and importing from file instead.');
    } finally {
      setIsLoading(false);
    }
  }, [urlValue, processJson]);

  // ---------------------------------------------------------------------------
  // Import actions (Phase 2)
  // ---------------------------------------------------------------------------
  const handleImportWithConfig = useCallback(() => {
    if (!importResult) return;

    // Apply credential selections to node configs
    const updatedNodes = importResult.nodes.map((node) => {
      const credRef = importResult.missing.credentialRefs.find((r) => r.nodeId === node.id);
      if (credRef && credentialSelections[credRef.nodeId]) {
        const selectedCred = availableCredentials.find(
          (c) => c.id === credentialSelections[credRef.nodeId]
        );
        if (selectedCred) {
          return {
            ...node,
            config: { ...node.config, credential: selectedCred.name },
            isConfigured: true,
          };
        }
      }
      return node;
    });

    const finalResult: N8nImportResult = {
      ...importResult,
      nodes: updatedNodes,
    };

    // Only pass env vars if any values were filled
    const filledEnvVars = Object.fromEntries(
      Object.entries(envVarValues).filter(([, v]) => v.trim() !== '')
    );

    onImportComplete(
      finalResult,
      Object.keys(filledEnvVars).length > 0 ? filledEnvVars : undefined
    );
    handleClose();
  }, [importResult, credentialSelections, envVarValues, availableCredentials, onImportComplete, handleClose]);

  const handleImportAnyway = useCallback(() => {
    if (!importResult) return;
    onImportComplete(importResult);
    handleClose();
  }, [importResult, onImportComplete, handleClose]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasMissingCreds = (importResult?.missing.credentialRefs.length ?? 0) > 0;
  const hasMissingEnvVars = (importResult?.missing.envVars.length ?? 0) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={phase === 'source' ? 'Import n8n Workflow' : 'Configure Imported Workflow'}
      description={
        phase === 'source'
          ? 'Import a workflow from an n8n JSON file or URL'
          : 'This workflow references credentials or environment variables that need configuration'
      }
      size="lg"
    >
      {/* ================================================================= */}
      {/* PHASE 1: Source Selection                                          */}
      {/* ================================================================= */}
      {phase === 'source' && (
        <div className="space-y-6">
          {/* File Upload / Drop Zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragOver
                ? 'border-green bg-green/5'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <FileJson className="w-6 h-6 text-white/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Drop an n8n JSON file here or click to browse
                </p>
                <p className="text-xs text-white/40 mt-1">Accepts .json files</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 font-medium">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Import from URL
            </label>
            <div className="flex gap-2">
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://raw.githubusercontent.com/..."
                className="flex-1 bg-dark-100 border-white/10 text-white placeholder:text-white/30"
                onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
              />
              <Button
                onClick={handleFetchUrl}
                disabled={!urlValue.trim() || isLoading}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10"
              >
                {isLoading ? 'Fetching…' : 'Fetch'}
              </Button>
            </div>
            <p className="text-xs text-white/30">
              Works with raw JSON URLs (GitHub raw, Gist). If fetch fails, download the file and use file import.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* PHASE 2: Missing Configuration                                    */}
      {/* ================================================================= */}
      {phase === 'config' && importResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green/5 border border-green/20">
            <ChevronRight className="w-4 h-4 text-green shrink-0" />
            <p className="text-sm text-white/70">
              Found <span className="text-green font-medium">{importResult.nodes.length}</span> nodes and{' '}
              <span className="text-green font-medium">{importResult.connections.length}</span> connections
              in "<span className="text-white font-medium">{importResult.workflowName}</span>"
            </p>
          </div>

          {/* Credential References */}
          {hasMissingCreds && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-yellow-400" />
                Credentials Required
              </h4>
              <div className="space-y-2">
                {importResult.missing.credentialRefs.map((ref) => (
                  <div
                    key={`${ref.nodeId}-${ref.credentialType}`}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{ref.nodeTitle}</p>
                        <p className="text-xs text-white/40">
                          {ref.credentialType} — <span className="text-white/30">n8n: {ref.n8nCredName}</span>
                        </p>
                      </div>
                      <select
                        className="px-3 py-1.5 rounded-lg bg-dark-100 border border-white/10 text-sm text-white min-w-[160px]"
                        value={credentialSelections[ref.nodeId] || ''}
                        onChange={(e) =>
                          setCredentialSelections((prev) => ({
                            ...prev,
                            [ref.nodeId]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select credential…</option>
                        {availableCredentials.map((cred) => (
                          <option key={cred.id} value={cred.id}>
                            {cred.name} ({cred.service})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          {hasMissingEnvVars && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Variable className="w-4 h-4 text-blue-400" />
                Environment Variables
              </h4>
              <div className="space-y-2">
                {importResult.missing.envVars.map((varName) => (
                  <div
                    key={varName}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <code className="text-xs text-green font-mono bg-green/10 px-2 py-1 rounded min-w-[120px]">
                      {varName}
                    </code>
                    <Input
                      value={envVarValues[varName] || ''}
                      onChange={(e) =>
                        setEnvVarValues((prev) => ({
                          ...prev,
                          [varName]: e.target.value,
                        }))
                      }
                      placeholder="Enter value (optional)"
                      className="flex-1 bg-dark-100 border-white/10 text-white placeholder:text-white/30 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={handleImportAnyway}
              className="text-white/50 hover:text-white"
            >
              Import Anyway
            </Button>
            <Button
              onClick={handleImportWithConfig}
              className="bg-green text-dark hover:bg-green-light font-medium"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import with Configuration
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
