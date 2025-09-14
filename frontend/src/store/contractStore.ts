import { create } from 'zustand';
import { 
  Contract, 
  ContractType, 
  ContractTemplate, 
  AIGenerationResponse,
  ComplianceScoreResponse
} from '../types';
import { ContractService } from '../services/api';
import { DEFAULT_CONTRACT_TYPE_OPTIONS, CONTRACT_STATUS_OPTIONS } from '../utils/contractTypes';

interface ContractsResponse {
  contracts: Contract[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface ContractState {
  contracts: Contract[];
  selectedContract: Contract | null;
  templates: ContractTemplate[];
  isLoading: boolean;
  isLoadingTemplates: boolean;
  error: string | null;
  lastFetchTime: number;
  lastRequestKey?: string;
  lastTemplatesKey?: string;
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
  // Internal state for request management
  _pendingRequests: Set<string>;
  
  // Actions
  fetchContracts: (params?: {
    page?: number;
    size?: number;
    contract_type?: string;
    status?: string;
    search?: string;
  }) => Promise<ContractsResponse | undefined>;
  fetchContract: (id: string) => Promise<Contract | undefined>;
  fetchTemplates: (params?: {
    contract_type?: string;
    category?: string;
  }) => Promise<ContractTemplate[]>;
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
  }) => Promise<Contract>;
  deleteContract: (id: string) => Promise<void>;
  generateContent: (id: string, regenerate?: boolean) => Promise<AIGenerationResponse>;
  analyzeCompliance: (id: string, force_reanalysis?: boolean) => Promise<ComplianceScoreResponse>;
  clearError: () => void;
  clearSelectedContract: () => void;
}

// Re-export for backward compatibility
export const CONTRACT_TYPE_OPTIONS = DEFAULT_CONTRACT_TYPE_OPTIONS;
export { CONTRACT_STATUS_OPTIONS };

export const useContractStore = create<ContractState>((set, get) => ({
  contracts: [],
  selectedContract: null,
  templates: [],
  isLoading: false,
  isLoadingTemplates: false,
  error: null,
  lastFetchTime: 0,
  lastRequestKey: undefined,
  lastTemplatesKey: undefined,
  pagination: {
    page: 1,
    size: 10,
    total: 0,
    pages: 0
  },
  // Request deduplication - use a string-based approach instead of Set
  _pendingRequests: new Set<string>(),

  fetchContracts: async (params: {
    page?: number;
    size?: number;
    contract_type?: string;
    status?: string;
    search?: string;
  } = {}) => {
    const now = Date.now();
    const state = get();

    // Canonicalize params for a stable key
    const keyParts = [
      `page=${params.page ?? 1}`,
      `size=${params.size ?? 100}`,
      `type=${params.contract_type ?? ''}`,
      `status=${params.status ?? ''}`,
      `search=${params.search ?? ''}`
    ];
    const requestKey = `contracts::${keyParts.join('|')}`;

    // Loop/dup guards
    const MIN_REFETCH_INTERVAL_MS = 3000; // 3s to suppress rapid repeats
    const recentSameRequest = state.lastRequestKey === requestKey && (now - state.lastFetchTime) < MIN_REFETCH_INTERVAL_MS;
    const alreadyPending = state._pendingRequests.has(requestKey);

    if (alreadyPending || recentSameRequest) {
      return;
    }

    // Add to pending requests before network call
    const pendingAdd = new Set(state._pendingRequests);
    pendingAdd.add(requestKey);
    set({ isLoading: true, error: null, _pendingRequests: pendingAdd, lastRequestKey: requestKey });
    
    try {
      const response = await ContractService.getContracts({
        page: params.page || 1,
        size: params.size || 100,
        contract_type: params.contract_type,
        status: params.status,
        search: params.search
      }) as ContractsResponse;
      
      set({ 
        contracts: response.contracts || [],
        pagination: {
          page: response.page || 1,
          size: response.size || 100,
          total: response.total || 0,
          pages: response.pages || 1
        },
        isLoading: false,
        error: null,
        lastFetchTime: now
      });
      
      return response;
    } catch (error: unknown) {
      console.error('Error fetching contracts:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load contracts';
      
      set({ 
        error: errorMessage,
        isLoading: false,
        contracts: [],
        pagination: { page: 1, size: 10, total: 0, pages: 0 },
        lastFetchTime: now
      });
      
      // Re-throw the error to be handled by the component
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load contracts');
    } finally {
      // Remove from pending requests using latest state
      const cur = get();
      const pendingNow = new Set(cur._pendingRequests);
      pendingNow.delete(requestKey);
      set({ _pendingRequests: pendingNow });
    }
  },

  fetchContract: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const contract = await ContractService.getContract(id) as Contract;
      set({ 
        selectedContract: contract,
        isLoading: false,
        error: null
      });
      return contract;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load contract';
      set({ 
        error: errorMessage,
        isLoading: false,
        selectedContract: null
      });
      console.error('Error fetching contract:', error);
      throw error;
    }
  },

  fetchTemplates: async (params = {}) => {
    const now = Date.now();
    const state = get();
    const key = `templates::${JSON.stringify(params)}`;

    const MIN_REFETCH_INTERVAL_MS = 10000; // 10s for templates
    const recentSameRequest = state.lastTemplatesKey === key && (now - state.lastFetchTime) < MIN_REFETCH_INTERVAL_MS;
    if (state.isLoadingTemplates || state._pendingRequests.has(key) || recentSameRequest) return [];

    const pendingAdd = new Set(state._pendingRequests);
    pendingAdd.add(key);
    set({ isLoadingTemplates: true, error: null, _pendingRequests: pendingAdd, lastTemplatesKey: key });
    
    try {
      const templates = await ContractService.getTemplates(params);
      const templatesList = templates || [];
      set({ 
        templates: templatesList,
        isLoadingTemplates: false,
        error: null
      });
      return templatesList;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load templates';
      set({ 
        error: errorMessage,
        isLoadingTemplates: false,
        templates: []
      });
      console.error('Error fetching templates:', error);
      return [];
    } finally {
      // Remove from pending requests using latest state
      const cur = get();
      const pendingNow = new Set(cur._pendingRequests);
      pendingNow.delete(key);
      set({ _pendingRequests: pendingNow });
    }
  },

  createContract: async (contractData: {
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
  }) => {
    set({ isLoading: true, error: null });
    try {
      const newContract = await ContractService.createContract(contractData) as Contract;
      
      // Add to the existing contracts list
      const contracts = [newContract, ...get().contracts];
      set({ 
        contracts,
        selectedContract: newContract,
        isLoading: false,
        error: null
      });
      
      return newContract;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create contract';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  updateContract: async (id: string, updates: {
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
  }) => {
    set({ isLoading: true, error: null });
    try {
      const updatedContract = await ContractService.updateContract(id, updates) as Contract;
      set(state => ({
        contracts: state.contracts.map(contract => 
          contract.id === id ? { ...contract, ...updatedContract } : contract
        ),
        selectedContract: state.selectedContract?.id === id 
          ? { ...state.selectedContract, ...updatedContract }
          : state.selectedContract,
        isLoading: false,
        error: null
      }));
      return updatedContract;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update contract';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      console.error('Error updating contract:', error);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete contract';
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate content';
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze compliance';
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