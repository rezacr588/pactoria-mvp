import { useCallback, useMemo } from 'react';
import { useContractStore } from '../store/contractStore';
import { useUIStore } from '../store/uiStore';
import { useStore, useOptimisticUpdate } from './useStore';
import { Contract } from '../types';

export interface UseContractsOptions {
  autoFetch?: boolean;
  optimisticUpdates?: boolean;
  filters?: {
    contract_type?: string;
    status?: string;
    search?: string;
  };
  pagination?: {
    page?: number;
    size?: number;
  };
}

export interface UseContractsReturn {
  // State
  contracts: Contract[];
  selectedContract: Contract | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
  
  // Actions with optimistic updates
  fetchContracts: (params?: any) => Promise<void>;
  fetchContract: (id: string) => Promise<void>;
  createContract: (data: any) => Promise<Contract>;
  updateContract: (id: string, updates: any) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  generateContent: (id: string, regenerate?: boolean) => Promise<any>;
  analyzeCompliance: (id: string, force?: boolean) => Promise<any>;
  
  // UI integration
  clearError: () => void;
  clearSelectedContract: () => void;
  
  // Computed values
  contractsByType: Record<string, Contract[]>;
  contractsByStatus: Record<string, Contract[]>;
  totalContracts: number;
  hasContracts: boolean;
  filteredContracts: Contract[];
  
  // Performance metrics
  lastFetchTime: number;
  isStale: boolean;
}

/**
 * Enhanced contracts hook with optimistic updates and UI integration
 */
export function useContracts(options: UseContractsOptions = {}): UseContractsReturn {
  const {
    optimisticUpdates = true,
    filters = {},
    pagination = {}
  } = options;

  // Optimized selectors to prevent unnecessary re-renders
  const contracts = useStore(useContractStore, (state) => state.contracts);
  const selectedContract = useStore(useContractStore, (state) => state.selectedContract);
  const isLoading = useStore(useContractStore, (state) => state.isLoading);
  const error = useStore(useContractStore, (state) => state.error);
  const paginationState = useStore(useContractStore, (state) => state.pagination);
  const lastFetchTime = useStore(useContractStore, (state) => state.lastFetchTime);

  // UI store integration
  const setUILoading = useUIStore((state) => state.setLoading);
  const setUIError = useUIStore((state) => state.setError);
  const addNotification = useUIStore((state) => state.addNotification);

  // Store actions
  const {
    fetchContracts: storeFetchContracts,
    fetchContract: storeFetchContract,
    createContract: storeCreateContract,
    updateContract: storeUpdateContract,
    deleteContract: storeDeleteContract,
    generateContent: storeGenerateContent,
    analyzeCompliance: storeAnalyzeCompliance,
    clearError: storeClearError,
    clearSelectedContract: storeClearSelectedContract
  } = useContractStore();

  // Optimistic update hooks
  const createOptimistic = useOptimisticUpdate(useContractStore, (state: any) => ({
    ...state,
    isLoading: true
  }));

  const updateOptimistic = useOptimisticUpdate(useContractStore, (state: any) => ({
    ...state,
    isLoading: true
  }));

  const deleteOptimistic = useOptimisticUpdate(useContractStore, (state: any) => ({
    ...state,
    isLoading: true
  }));

  // Enhanced fetch with UI integration
  const fetchContracts = useCallback(async (params = {}) => {
    const mergedParams = {
      ...filters,
      ...pagination,
      ...params
    };

    setUILoading('contracts-fetch', true);
    
    try {
      await storeFetchContracts(mergedParams);
      setUIError('contracts-fetch', null);
      // Only show success notification in development
      if (process.env.NODE_ENV === 'development') {
        addNotification({
          type: 'success',
          message: 'Contracts loaded successfully',
          duration: 2000
        });
      }
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load contracts';
      setUIError('contracts-fetch', errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
      throw error;
    } finally {
      setUILoading('contracts-fetch', false);
    }
  }, [storeFetchContracts, filters, pagination, setUILoading, setUIError, addNotification]);

  // Enhanced create with optimistic updates
  const createContract = useCallback(async (data: any): Promise<Contract> => {
    if (optimisticUpdates) {
      createOptimistic.applyOptimisticUpdate();
    }

    setUILoading('contract-create', true);
    
    try {
      const newContract = await storeCreateContract(data);
      
      if (optimisticUpdates) {
        createOptimistic.commit();
      }
      
      setUIError('contract-create', null);
      addNotification({
        type: 'success',
        message: `Contract "${newContract.title}" created successfully`,
        duration: 3000
      });
      
      return newContract;
    } catch (error: any) {
      if (optimisticUpdates) {
        createOptimistic.rollback();
      }
      
      const errorMessage = error.data?.detail || error.message || 'Failed to create contract';
      setUIError('contract-create', errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
      throw error;
    } finally {
      setUILoading('contract-create', false);
    }
  }, [storeCreateContract, optimisticUpdates, createOptimistic, setUILoading, setUIError, addNotification]);

  // Enhanced update with optimistic updates
  const updateContract = useCallback(async (id: string, updates: any): Promise<void> => {
    if (optimisticUpdates) {
      updateOptimistic.applyOptimisticUpdate();
    }

    setUILoading(`contract-update-${id}`, true);
    
    try {
      await storeUpdateContract(id, updates);
      
      if (optimisticUpdates) {
        updateOptimistic.commit();
      }
      
      setUIError(`contract-update-${id}`, null);
      addNotification({
        type: 'success',
        message: 'Contract updated successfully',
        duration: 3000
      });
    } catch (error: any) {
      if (optimisticUpdates) {
        updateOptimistic.rollback();
      }
      
      const errorMessage = error.data?.detail || error.message || 'Failed to update contract';
      setUIError(`contract-update-${id}`, errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
      throw error;
    } finally {
      setUILoading(`contract-update-${id}`, false);
    }
  }, [storeUpdateContract, optimisticUpdates, updateOptimistic, setUILoading, setUIError, addNotification]);

  // Enhanced delete with optimistic updates
  const deleteContract = useCallback(async (id: string): Promise<void> => {
    if (optimisticUpdates) {
      deleteOptimistic.applyOptimisticUpdate();
    }

    setUILoading(`contract-delete-${id}`, true);
    
    try {
      await storeDeleteContract(id);
      
      if (optimisticUpdates) {
        deleteOptimistic.commit();
      }
      
      setUIError(`contract-delete-${id}`, null);
      addNotification({
        type: 'success',
        message: 'Contract deleted successfully',
        duration: 3000
      });
    } catch (error: any) {
      if (optimisticUpdates) {
        deleteOptimistic.rollback();
      }
      
      const errorMessage = error.data?.detail || error.message || 'Failed to delete contract';
      setUIError(`contract-delete-${id}`, errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
      throw error;
    } finally {
      setUILoading(`contract-delete-${id}`, false);
    }
  }, [storeDeleteContract, optimisticUpdates, deleteOptimistic, setUILoading, setUIError, addNotification]);

  // Enhanced actions with UI integration
  const fetchContract = useCallback(async (id: string) => {
    setUILoading(`contract-fetch-${id}`, true);
    try {
      await storeFetchContract(id);
      setUIError(`contract-fetch-${id}`, null);
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load contract';
      setUIError(`contract-fetch-${id}`, errorMessage);
      throw error;
    } finally {
      setUILoading(`contract-fetch-${id}`, false);
    }
  }, [storeFetchContract, setUILoading, setUIError]);

  const generateContent = useCallback(async (id: string, regenerate = false) => {
    setUILoading(`contract-generate-${id}`, true);
    try {
      const result = await storeGenerateContent(id, regenerate);
      setUIError(`contract-generate-${id}`, null);
      addNotification({
        type: 'success',
        message: 'Contract content generated successfully',
        duration: 3000
      });
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to generate content';
      setUIError(`contract-generate-${id}`, errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
      throw error;
    } finally {
      setUILoading(`contract-generate-${id}`, false);
    }
  }, [storeGenerateContent, setUILoading, setUIError, addNotification]);

  const analyzeCompliance = useCallback(async (id: string, force = false) => {
    setUILoading(`contract-compliance-${id}`, true);
    try {
      const result = await storeAnalyzeCompliance(id, force);
      setUIError(`contract-compliance-${id}`, null);
      addNotification({
        type: 'success',
        message: 'Compliance analysis completed',
        duration: 3000
      });
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to analyze compliance';
      setUIError(`contract-compliance-${id}`, errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
      throw error;
    } finally {
      setUILoading(`contract-compliance-${id}`, false);
    }
  }, [storeAnalyzeCompliance, setUILoading, setUIError, addNotification]);

  // UI integration for error clearing
  const clearError = useCallback(() => {
    storeClearError();
    setUIError('contracts-fetch', null);
    setUIError('contract-create', null);
  }, [storeClearError, setUIError]);

  // Computed values with memoization
  const contractsByType = useMemo(() => {
    return contracts.reduce((acc: Record<string, Contract[]>, contract: Contract) => {
      const type = contract.contract_type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(contract);
      return acc;
    }, {} as Record<string, Contract[]>);
  }, [contracts]);

  const contractsByStatus = useMemo(() => {
    return contracts.reduce((acc: Record<string, Contract[]>, contract: Contract) => {
      const status = contract.status || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(contract);
      return acc;
    }, {} as Record<string, Contract[]>);
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    let filtered = [...contracts];

    if (filters.contract_type) {
      filtered = filtered.filter(c => c.contract_type === filters.contract_type);
    }

    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(searchLower) ||
        c.client_name?.toLowerCase().includes(searchLower) ||
        c.supplier_name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [contracts, filters]);

  const totalContracts = contracts.length;
  const hasContracts = totalContracts > 0;
  const isStale = lastFetchTime ? Date.now() - lastFetchTime > 5 * 60 * 1000 : true; // 5 minutes

  return {
    // State
    contracts,
    selectedContract,
    isLoading,
    error,
    pagination: paginationState,
    
    // Actions
    fetchContracts,
    fetchContract,
    createContract,
    updateContract,
    deleteContract,
    generateContent,
    analyzeCompliance,
    clearError,
    clearSelectedContract: storeClearSelectedContract,
    
    // Computed values
    contractsByType,
    contractsByStatus,
    totalContracts,
    hasContracts,
    filteredContracts,
    
    // Performance metrics
    lastFetchTime,
    isStale
  };
}
