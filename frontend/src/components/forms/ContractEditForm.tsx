import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Contract } from '../../types';
import { FormErrors } from '../../types/contract-form';
import { InteractiveEditor, EditorFormData } from '../editors';

interface ContractEditFormProps {
  contract: Contract;
  onUpdate: (data: Partial<Contract>) => Promise<void>;
  isUpdating: boolean;
  errors?: FormErrors;
}

export function ContractEditForm({ 
  contract, 
  onUpdate, 
  isUpdating, 
  errors: externalErrors = {} 
}: ContractEditFormProps) {
  const navigate = useNavigate();

  // Convert contract data to editor format
  const editorData: EditorFormData = {
    templateId: contract.template_id || '',
    name: contract.title || '',
    description: '',
    clientName: contract.client_name || '',
    clientEmail: contract.client_email || '',
    serviceDescription: contract.plain_english_input || '',
    contractValue: contract.contract_value?.toString() || '',
    startDate: contract.start_date ? contract.start_date.split('T')[0] : '',
    endDate: contract.end_date ? contract.end_date.split('T')[0] : '',
    paymentTerms: '30',
    specialTerms: '',
    plainEnglishInput: contract.plain_english_input || '',
    supplierName: contract.supplier_name || '',
    currency: contract.currency || 'GBP',
  };

  const handleUpdate = async (formData: Partial<EditorFormData>) => {
    const updateData: Partial<Contract> = {
      title: formData.name,
      client_name: formData.clientName,
      client_email: formData.clientEmail || undefined,
      supplier_name: formData.supplierName || undefined,
      contract_value: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
      currency: formData.currency,
      start_date: formData.startDate || undefined,
      end_date: formData.endDate || undefined,
      plain_english_input: formData.plainEnglishInput,
    };

    await onUpdate(updateData);
  };

  const handleCancel = () => {
    navigate(`/contracts/${contract.id}`);
  };

  return (
    <InteractiveEditor
      data={editorData}
      onUpdate={handleUpdate}
      isUpdating={isUpdating}
      onCancel={handleCancel}
      errors={externalErrors}
      mode="contract"
      title="Edit Contract"
      subtitle="Modify contract details and update your UK-compliant contract"
    />
  );
}