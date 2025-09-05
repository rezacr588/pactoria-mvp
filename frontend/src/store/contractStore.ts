import { create } from 'zustand';
import { 
  Contract, 
  ContractType, 
  ContractTemplate, 
  AIGenerationResponse,
  ComplianceScoreResponse
} from '../types';
import { ContractService } from '../services/api';

interface ContractState {
  contracts: Contract[];
  selectedContract: Contract | null;
  templates: ContractTemplate[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
  
  // Actions
  fetchContracts: (params?: {
    page?: number;
    size?: number;
    contract_type?: string;
    status?: string;
    search?: string;
  }) => Promise<void>;
  fetchContract: (id: string) => Promise<void>;
  fetchTemplates: (params?: {
    contract_type?: string;
    category?: string;
  }) => Promise<void>;
  createContract: (contractData: {
    title: string;
    contract_type: ContractType;
    plain_english_input: string;
    client_name?: string;
    client_email?: string;
    supplier_name?: string;
    contract_value?: number;
    currency?: string;
    start_date?: string;
    end_date?: string;
    template_id?: string;
  }) => Promise<Contract>;
  updateContract: (id: string, updates: {
    title?: string;
    status?: string;
    client_name?: string;
    client_email?: string;
    supplier_name?: string;
    contract_value?: number;
    currency?: string;
    start_date?: string;
    end_date?: string;
    final_content?: string;
  }) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  generateContent: (id: string, regenerate?: boolean) => Promise<AIGenerationResponse>;
  analyzeCompliance: (id: string, force_reanalysis?: boolean) => Promise<ComplianceScoreResponse>;
  clearError: () => void;
  clearSelectedContract: () => void;
}

// Contract type options for UI
export const CONTRACT_TYPE_OPTIONS = [
  { value: 'service_agreement', label: 'Service Agreement' },
  { value: 'employment_contract', label: 'Employment Contract' },
  { value: 'supplier_agreement', label: 'Supplier Agreement' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'terms_conditions', label: 'Terms & Conditions' },
  { value: 'consultancy', label: 'Consultancy Agreement' },
  { value: 'partnership', label: 'Partnership Agreement' },
  { value: 'lease', label: 'Lease Agreement' }
];

// Contract status options for UI
export const CONTRACT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' }
];

export const useContractStore = create<ContractState>((set, get) => ({
  contracts: [],
  selectedContract: null,
  templates: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    size: 10,
    total: 0,
    pages: 0
  },

  fetchContracts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ContractService.getContracts(params);
      set({ 
        contracts: response.contracts,
        pagination: {
          page: response.page,
          size: response.size,
          total: response.total,
          pages: response.pages
        },
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load contracts';
      set({ 
        error: errorMessage,
        isLoading: false,
        contracts: [],
        pagination: { page: 1, size: 10, total: 0, pages: 0 }
      });
      throw error;
    }
  },

  fetchContract: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const contract = await ContractService.getContract(id);
      set({ 
        selectedContract: contract,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load contract';
      set({ 
        error: errorMessage,
        isLoading: false,
        selectedContract: null
      });
      throw error;
    }
  },

  fetchTemplates: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const templates = await ContractService.getTemplates(params);
      set({ 
        templates,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load templates';
      set({ 
        error: errorMessage,
        isLoading: false,
        templates: []
      });
      throw error;
    }
  },


  createContract: async (contractData) => {
    set({ isLoading: true, error: null });
    try {
      const newContract = await ContractService.createContract(contractData);
      
      // Add to the existing contracts list
      const contracts = [newContract, ...get().contracts];
      set({ 
        contracts,
        selectedContract: newContract,
        isLoading: false,
        error: null
      });
      
      return newContract;
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to create contract';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  updateContract: async (id: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedContract = await ContractService.updateContract(id, updates);
      
      // Update in contracts list
      const contracts = get().contracts.map(contract => 
        contract.id === id ? updatedContract : contract
      );
      
      // Update selected contract if it's the one being updated
      const selectedContract = get().selectedContract?.id === id ? updatedContract : get().selectedContract;
      
      set({ 
        contracts,
        selectedContract,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to update contract';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  deleteContract: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await ContractService.deleteContract(id);
      
      // Remove from contracts list
      const contracts = get().contracts.filter(contract => contract.id !== id);
      
      // Clear selected contract if it was the deleted one
      const selectedContract = get().selectedContract?.id === id ? null : get().selectedContract;
      
      set({ 
        contracts,
        selectedContract,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to delete contract';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  generateContent: async (id: string, regenerate = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ContractService.generateContent(id, regenerate);
      
      // Refresh the contract to get updated content
      const updatedContract = await ContractService.getContract(id);
      
      // Update contracts list and selected contract
      const contracts = get().contracts.map(contract => 
        contract.id === id ? updatedContract : contract
      );
      
      const selectedContract = get().selectedContract?.id === id ? updatedContract : get().selectedContract;
      
      set({ 
        contracts,
        selectedContract,
        isLoading: false,
        error: null
      });
      
      return response;
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to generate contract content';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  analyzeCompliance: async (id: string, force_reanalysis = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ContractService.analyzeCompliance(id, force_reanalysis);
      
      // Optionally refresh the contract to get updated compliance data
      // For now, just return the response without refreshing
      
      set({ 
        isLoading: false,
        error: null
      });
      
      return response;
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to analyze contract compliance';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearSelectedContract: () => {
    set({ selectedContract: null });
  }
}));