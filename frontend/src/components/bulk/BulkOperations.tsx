import React, { useState, useCallback, useEffect } from 'react';
import { BulkService } from '../../services/api';
import { 
  BulkOperationResponse, 
  BulkOperationError,
  ContractBulkUpdateFields,
  BulkExportResponse,
  UserInvitation 
} from '../../types';
import { useFormValidation } from '../../hooks/useFormValidation';

interface BulkOperationsProps {
  selectedContractIds?: string[];
  selectedUserIds?: string[];
  onSuccess?: (result: BulkOperationResponse | BulkExportResponse) => void;
  onError?: (error: string) => void;
}

type BulkOperation = 'update' | 'delete' | 'export' | 'invite' | 'role_change';

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedContractIds = [],
  selectedUserIds = [],
  onSuccess,
  onError
}) => {
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Form states
  const [updateFields, setUpdateFields] = useState<ContractBulkUpdateFields>({});
  const [deletionReason, setDeletionReason] = useState('');
  const [exportFormat, setExportFormat] = useState<'CSV' | 'EXCEL' | 'PDF' | 'JSON'>('CSV');
  const [exportFields, setExportFields] = useState<string[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([{ email: '', full_name: '', role: 'VIEWER' }]);
  const [newRole, setNewRole] = useState<string>('VIEWER');

  const { errors, validateField, clearErrors } = useFormValidation();

  // Bulk update contracts
  const handleBulkUpdate = useCallback(async () => {
    if (selectedContractIds.length === 0) {
      onError?.('No contracts selected');
      return;
    }

    if (Object.keys(updateFields).length === 0) {
      onError?.('Please specify at least one field to update');
      return;
    }

    clearErrors();
    setIsLoading(true);
    setProgress(0);

    try {
      const result = await BulkService.bulkUpdateContracts({
        contract_ids: selectedContractIds,
        updates: updateFields
      });

      setProgress(100);
      onSuccess?.(result);

      if (result.failed_count > 0) {
        onError?.(`Updated ${result.success_count} contracts, ${result.failed_count} failed`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk update failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  }, [selectedContractIds, updateFields, onSuccess, onError, validateField, clearErrors]);

  // Bulk delete contracts
  const handleBulkDelete = useCallback(async () => {
    if (selectedContractIds.length === 0) {
      onError?.('No contracts selected');
      return;
    }

    if (!deletionReason.trim()) {
      onError?.('Please provide a reason for deletion');
      return;
    }

    clearErrors();
    setIsLoading(true);

    try {
      const result = await BulkService.bulkDeleteContracts({
        contract_ids: selectedContractIds,
        deletion_reason: deletionReason.trim()
      });

      onSuccess?.(result);

      if (result.failed_count > 0) {
        onError?.(`Deleted ${result.success_count} contracts, ${result.failed_count} failed`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk delete failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  }, [selectedContractIds, deletionReason, onSuccess, onError, validateField, clearErrors]);

  // Bulk export contracts
  const handleBulkExport = useCallback(async () => {
    if (selectedContractIds.length === 0) {
      onError?.('No contracts selected');
      return;
    }

    clearErrors();
    setIsLoading(true);

    try {
      const result = await BulkService.bulkExportContracts({
        contract_ids: selectedContractIds,
        format: exportFormat,
        fields: exportFields.length > 0 ? exportFields : undefined,
        include_content: true,
        include_versions: false
      });

      onSuccess?.(result);

      // Auto-download if URL is provided
      if (result.download_url) {
        const link = document.createElement('a');
        link.href = result.download_url;
        link.download = `contracts-export.${exportFormat.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk export failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  }, [selectedContractIds, exportFormat, exportFields, onSuccess, onError, clearErrors]);

  // Bulk invite users
  const handleBulkInvite = useCallback(async () => {
    const validInvitations = invitations.filter(inv => inv.email && inv.full_name);
    
    if (validInvitations.length === 0) {
      onError?.('Please add at least one valid invitation');
      return;
    }

    clearErrors();
    setIsLoading(true);

    try {
      const result = await BulkService.bulkInviteUsers({
        invitations: validInvitations
      });

      onSuccess?.(result);

      if (result.failed_count > 0) {
        onError?.(`Invited ${result.success_count} users, ${result.failed_count} failed`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk invite failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  }, [invitations, onSuccess, onError, validateField, clearErrors]);

  // Bulk role change
  const handleBulkRoleChange = useCallback(async () => {
    if (selectedUserIds.length === 0) {
      onError?.('No users selected');
      return;
    }

    clearErrors();
    setIsLoading(true);

    try {
      const result = await BulkService.bulkChangeUserRoles({
        user_ids: selectedUserIds,
        new_role: newRole
      });

      onSuccess?.(result);

      if (result.failed_count > 0) {
        onError?.(`Updated ${result.success_count} user roles, ${result.failed_count} failed`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk role change failed';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  }, [selectedUserIds, newRole, onSuccess, onError, clearErrors]);

  // Add invitation row
  const addInvitation = useCallback(() => {
    setInvitations(prev => [...prev, { email: '', full_name: '', role: 'VIEWER' }]);
  }, []);

  // Remove invitation row
  const removeInvitation = useCallback((index: number) => {
    setInvitations(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update invitation
  const updateInvitation = useCallback((index: number, field: keyof UserInvitation, value: string | boolean) => {
    setInvitations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const renderOperationForm = () => {
    switch (activeOperation) {
      case 'update':
        return (
          <div className="operation-form">
            <h3>Bulk Update Contracts ({selectedContractIds.length} selected)</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={updateFields.status || ''}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, status: e.target.value || undefined }))}
                >
                  <option value="">-- No change --</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  value={updateFields.client_name || ''}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, client_name: e.target.value || undefined }))}
                  placeholder="Leave empty for no change"
                />
              </div>

              <div className="form-group">
                <label>Supplier Name</label>
                <input
                  type="text"
                  value={updateFields.supplier_name || ''}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, supplier_name: e.target.value || undefined }))}
                  placeholder="Leave empty for no change"
                />
              </div>

              <div className="form-group">
                <label>Contract Value</label>
                <input
                  type="number"
                  value={updateFields.contract_value || ''}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, contract_value: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="Leave empty for no change"
                />
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={updateFields.start_date || ''}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, start_date: e.target.value || undefined }))}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={updateFields.end_date || ''}
                  onChange={(e) => setUpdateFields(prev => ({ ...prev, end_date: e.target.value || undefined }))}
                />
              </div>
            </div>

            {errors.updateFields && (
              <div className="error-message">{errors.updateFields}</div>
            )}

            <div className="form-actions">
              <button onClick={() => setActiveOperation(null)} className="button secondary">
                Cancel
              </button>
              <button onClick={handleBulkUpdate} disabled={isLoading} className="button primary">
                {isLoading ? 'Updating...' : 'Update Contracts'}
              </button>
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="operation-form">
            <h3>Bulk Delete Contracts ({selectedContractIds.length} selected)</h3>
            
            <div className="form-group">
              <label htmlFor="deletion-reason">Reason for Deletion *</label>
              <textarea
                id="deletion-reason"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Please provide a reason for deleting these contracts..."
                rows={3}
                className={errors.deletionReason ? 'error' : ''}
                required
              />
              {errors.deletionReason && (
                <div className="error-message">{errors.deletionReason}</div>
              )}
            </div>

            <div className="warning-message">
              <strong>Warning:</strong> This will soft-delete the selected contracts. 
              They will be marked as terminated but not permanently removed.
            </div>

            <div className="form-actions">
              <button onClick={() => setActiveOperation(null)} className="button secondary">
                Cancel
              </button>
              <button onClick={handleBulkDelete} disabled={isLoading} className="button danger">
                {isLoading ? 'Deleting...' : 'Delete Contracts'}
              </button>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="operation-form">
            <h3>Bulk Export Contracts ({selectedContractIds.length} selected)</h3>
            
            <div className="form-group">
              <label>Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'CSV' | 'EXCEL' | 'PDF' | 'JSON')}
              >
                <option value="CSV">CSV</option>
                <option value="EXCEL">Excel</option>
                <option value="PDF">PDF</option>
                <option value="JSON">JSON</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fields to Export (leave empty for all)</label>
              <div className="checkbox-group">
                {[
                  'title', 'status', 'contract_type', 'client_name', 'supplier_name',
                  'contract_value', 'start_date', 'end_date', 'created_at', 'compliance_score'
                ].map(field => (
                  <label key={field} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportFields(prev => [...prev, field]);
                        } else {
                          setExportFields(prev => prev.filter(f => f !== field));
                        }
                      }}
                    />
                    {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button onClick={() => setActiveOperation(null)} className="button secondary">
                Cancel
              </button>
              <button onClick={handleBulkExport} disabled={isLoading} className="button primary">
                {isLoading ? 'Exporting...' : 'Export Contracts'}
              </button>
            </div>
          </div>
        );

      case 'invite':
        return (
          <div className="operation-form">
            <h3>Bulk Invite Users</h3>
            
            <div className="invitations-list">
              {invitations.map((invitation, index) => (
                <div key={index} className="invitation-row">
                  <input
                    type="email"
                    value={invitation.email}
                    onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                    placeholder="Email address"
                    required
                  />
                  <input
                    type="text"
                    value={invitation.full_name}
                    onChange={(e) => updateInvitation(index, 'full_name', e.target.value)}
                    placeholder="Full name"
                    required
                  />
                  <select
                    value={invitation.role}
                    onChange={(e) => updateInvitation(index, 'role', e.target.value)}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="LEGAL_REVIEWER">Legal Reviewer</option>
                    <option value="CONTRACT_MANAGER">Contract Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <input
                    type="text"
                    value={invitation.department || ''}
                    onChange={(e) => updateInvitation(index, 'department', e.target.value)}
                    placeholder="Department (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => removeInvitation(index)}
                    className="button small danger"
                    disabled={invitations.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addInvitation} className="button secondary">
              Add Another User
            </button>

            {errors.invitations && (
              <div className="error-message">{errors.invitations}</div>
            )}

            <div className="form-actions">
              <button onClick={() => setActiveOperation(null)} className="button secondary">
                Cancel
              </button>
              <button onClick={handleBulkInvite} disabled={isLoading} className="button primary">
                {isLoading ? 'Sending Invites...' : 'Send Invitations'}
              </button>
            </div>
          </div>
        );

      case 'role_change':
        return (
          <div className="operation-form">
            <h3>Bulk Change User Roles ({selectedUserIds.length} selected)</h3>
            
            <div className="form-group">
              <label>New Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="VIEWER">Viewer</option>
                <option value="LEGAL_REVIEWER">Legal Reviewer</option>
                <option value="CONTRACT_MANAGER">Contract Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="warning-message">
              <strong>Warning:</strong> This will change the role for all selected users. 
              Make sure this is intended as it affects their system permissions.
            </div>

            <div className="form-actions">
              <button onClick={() => setActiveOperation(null)} className="button secondary">
                Cancel
              </button>
              <button onClick={handleBulkRoleChange} disabled={isLoading} className="button primary">
                {isLoading ? 'Updating Roles...' : 'Update User Roles'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (activeOperation) {
    return (
      <div className="bulk-operations-modal">
        <div className="modal-content">
          {renderOperationForm()}
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-operations">
      <h2>Bulk Operations</h2>
      
      <div className="operation-buttons">
        {/* Contract Operations */}
        {selectedContractIds.length > 0 && (
          <div className="operation-group">
            <h3>Contract Operations ({selectedContractIds.length} selected)</h3>
            <div className="button-group">
              <button 
                onClick={() => setActiveOperation('update')} 
                className="button primary"
              >
                Bulk Update
              </button>
              <button 
                onClick={() => setActiveOperation('delete')} 
                className="button danger"
              >
                Bulk Delete
              </button>
              <button 
                onClick={() => setActiveOperation('export')} 
                className="button secondary"
              >
                Export
              </button>
            </div>
          </div>
        )}

        {/* User Operations */}
        {selectedUserIds.length > 0 && (
          <div className="operation-group">
            <h3>User Operations ({selectedUserIds.length} selected)</h3>
            <div className="button-group">
              <button 
                onClick={() => setActiveOperation('role_change')} 
                className="button primary"
              >
                Change Roles
              </button>
            </div>
          </div>
        )}

        {/* General Operations */}
        <div className="operation-group">
          <h3>General Operations</h3>
          <div className="button-group">
            <button 
              onClick={() => setActiveOperation('invite')} 
              className="button primary"
            >
              Invite Users
            </button>
          </div>
        </div>
      </div>

      {selectedContractIds.length === 0 && selectedUserIds.length === 0 && (
        <div className="no-selection-message">
          Select contracts or users to enable bulk operations.
        </div>
      )}

      <style>{`
        .bulk-operations {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 24px;
        }

        .bulk-operations h2 {
          margin: 0 0 24px 0;
          color: #1f2937;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .operation-group {
          margin-bottom: 24px;
        }

        .operation-group h3 {
          margin: 0 0 12px 0;
          color: #374151;
          font-size: 1.125rem;
          font-weight: 500;
        }

        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .button {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: 2px solid;
          transition: all 0.2s;
        }

        .button.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .button.primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .button.secondary {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        .button.secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .button.danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .button.danger:hover:not(:disabled) {
          background: #dc2626;
          border-color: #dc2626;
        }

        .button.small {
          padding: 6px 12px;
          font-size: 0.75rem;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .no-selection-message {
          text-align: center;
          color: #6b7280;
          font-style: italic;
          margin-top: 32px;
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .bulk-operations-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .operation-form h3 {
          margin: 0 0 24px 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 8px;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .form-group input.error, .form-group textarea.error {
          border-color: #ef4444;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 4px;
        }

        .warning-message {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 12px;
          margin: 16px 0;
          color: #92400e;
          font-size: 0.875rem;
        }

        .checkbox-group {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .invitations-list {
          margin-bottom: 16px;
        }

        .invitation-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1fr auto;
          gap: 8px;
          margin-bottom: 12px;
          align-items: center;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }

        @media (max-width: 768px) {
          .button-group {
            flex-direction: column;
          }
          
          .invitation-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default BulkOperations;