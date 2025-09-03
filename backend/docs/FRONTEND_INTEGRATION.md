# Frontend Integration Guide

**Pactoria MVP Backend - Complete Frontend Developer Reference**

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Authentication Integration](#authentication-integration)
3. [API Client Implementation](#api-client-implementation)
4. [Contract Management Integration](#contract-management-integration)
5. [Real-time Features](#real-time-features)
6. [Error Handling](#error-handling)
7. [State Management](#state-management)
8. [Performance Optimization](#performance-optimization)
9. [Testing Integration](#testing-integration)

---

## Integration Overview

The Pactoria backend provides a comprehensive REST API designed for modern frontend frameworks (React, Vue.js, Angular). This guide provides practical examples and best practices for frontend integration.

### API Base Configuration

**Base URL**: `https://api.pactoria.com` (production) | `http://localhost:8000` (development)
**API Version**: `v1`
**Content Type**: `application/json`
**Authentication**: JWT Bearer tokens

### Core Integration Requirements

```typescript
// Frontend configuration
interface ApiConfig {
  baseURL: string;
  version: string;
  timeout: number;
  retryAttempts: number;
}

const config: ApiConfig = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  version: 'v1',
  timeout: 30000,
  retryAttempts: 3
};
```

---

## Authentication Integration

### JWT Token Management

**Complete authentication flow with token persistence and refresh:**

```typescript
// types/auth.ts
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  full_name: string;
  password: string;
  company_name: string;
  timezone?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: 'admin' | 'contract_manager' | 'legal_reviewer' | 'viewer';
  company_id: string;
  company: {
    id: string;
    name: string;
    subscription_tier: 'starter' | 'professional' | 'business';
  };
}

// services/authService.ts
class AuthService {
  private tokenKey = 'pactoria_auth_token';
  private userKey = 'pactoria_user';

  constructor(private apiClient: ApiClient) {}

  async login(credentials: LoginCredentials): Promise<{ token: AuthToken; user: User }> {
    try {
      const response = await this.apiClient.post('/auth/login', credentials);
      
      // Store token and user data
      this.setToken(response.data.token);
      this.setUser(response.data.user);
      
      return response.data;
    } catch (error) {
      // Enhanced error handling for login failures
      if (error.response?.status === 401) {
        throw new AuthError('Invalid email or password');
      } else if (error.response?.status === 423) {
        throw new AuthError('Account locked due to too many failed attempts');
      }
      throw error;
    }
  }

  async register(data: RegisterData): Promise<{ token: AuthToken; user: User }> {
    try {
      const response = await this.apiClient.post('/auth/register', data);
      
      // Automatically log in after registration
      this.setToken(response.data.token);
      this.setUser(response.data.user);
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        throw new AuthError('Email address already registered');
      }
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.apiClient.get('/auth/me');
    this.setUser(response.data.user);
    return response.data.user;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    // Clear API client auth header
    this.apiClient.setAuthToken(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): User | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  private setToken(token: AuthToken): void {
    localStorage.setItem(this.tokenKey, JSON.stringify(token));
    this.apiClient.setAuthToken(token.access_token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (error) {
      return true;
    }
  }
}
```

### React Authentication Hook

```typescript
// hooks/useAuth.ts
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      // Token might be invalid, clear auth data
      authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { user } = await authService.login(credentials);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const { user } = await authService.register(data);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected Route Component
export const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

---

## API Client Implementation

### Comprehensive HTTP Client

```typescript
// services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(private config: ApiConfig) {
    this.client = axios.create({
      baseURL: `${config.baseURL}/api/${config.version}`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token to requests
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError = this.transformError(error);
        
        // Handle token expiration
        if (apiError.status === 401) {
          this.handleTokenExpiration();
        }

        return Promise.reject(apiError);
      }
    );
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config);
  }

  // Specialized methods for file uploads
  async uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  private transformError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return new ApiError(
        data.error?.message || data.detail || 'API request failed',
        status,
        data.error?.code,
        data.error?.details
      );
    } else if (error.request) {
      // Request made but no response received
      return new ApiError('Network error: No response from server', 0, 'NETWORK_ERROR');
    } else {
      // Error in setting up the request
      return new ApiError(error.message, 0, 'REQUEST_ERROR');
    }
  }

  private handleTokenExpiration(): void {
    // Clear auth data and redirect to login
    localStorage.removeItem('pactoria_auth_token');
    localStorage.removeItem('pactoria_user');
    window.location.href = '/login';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## Contract Management Integration

### Contract Service Implementation

```typescript
// types/contract.ts
export interface Contract {
  id: string;
  title: string;
  contract_type: 'service_agreement' | 'employment_contract' | 'supplier_agreement' | 'nda' | 'terms_conditions';
  status: 'draft' | 'active' | 'completed' | 'expired' | 'terminated';
  plain_english_input?: string;
  generated_content?: string;
  final_content?: string;
  client_name: string;
  client_email?: string;
  supplier_name?: string;
  contract_value?: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  version: number;
  compliance_score?: ComplianceScore;
  risk_assessment?: RiskAssessment;
  created_at: string;
  updated_at?: string;
}

export interface ContractCreate {
  title: string;
  contract_type: Contract['contract_type'];
  plain_english_input: string;
  client_name: string;
  client_email?: string;
  supplier_name?: string;
  contract_value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  template_id?: string;
}

export interface ContractFilter {
  contract_type?: Contract['contract_type'];
  status?: Contract['status'];
  search?: string;
  created_after?: string;
  created_before?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// services/contractService.ts
export class ContractService {
  constructor(private apiClient: ApiClient) {}

  async createContract(data: ContractCreate): Promise<Contract> {
    const response = await this.apiClient.post('/contracts/', data);
    return response.data.contract;
  }

  async getContracts(
    page = 1,
    size = 20,
    filters?: ContractFilter
  ): Promise<PaginatedResponse<Contract>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const response = await this.apiClient.get(`/contracts/?${params}`);
    return response.data;
  }

  async getContract(id: string): Promise<Contract> {
    const response = await this.apiClient.get(`/contracts/${id}`);
    return response.data.contract;
  }

  async updateContract(id: string, data: Partial<ContractCreate>): Promise<Contract> {
    const response = await this.apiClient.put(`/contracts/${id}`, data);
    return response.data.contract;
  }

  async deleteContract(id: string): Promise<void> {
    await this.apiClient.delete(`/contracts/${id}`);
  }

  async generateContract(id: string, regenerate = false): Promise<AIGeneration> {
    const response = await this.apiClient.post(`/contracts/${id}/generate`, {
      regenerate
    });
    return response.data.ai_generation;
  }

  async analyzeCompliance(id: string, forceReanalysis = false): Promise<ComplianceAnalysis> {
    const response = await this.apiClient.post(`/contracts/${id}/analyze`, {
      force_reanalysis: forceReanalysis
    });
    return response.data.compliance_analysis;
  }

  async activateContract(id: string, reason?: string): Promise<Contract> {
    const response = await this.apiClient.post(`/contracts/${id}/activate`, {
      activation_reason: reason
    });
    return response.data.contract;
  }

  async completeContract(id: string, reason: string): Promise<Contract> {
    const response = await this.apiClient.post(`/contracts/${id}/complete`, {
      completion_reason: reason
    });
    return response.data.contract;
  }
}
```

### React Contract Management Hooks

```typescript
// hooks/useContracts.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';

export const useContracts = (page = 1, size = 20, filters?: ContractFilter) => {
  return useQuery(
    ['contracts', page, size, filters],
    () => contractService.getContracts(page, size, filters),
    {
      keepPreviousData: true,
      staleTime: 30000, // 30 seconds
    }
  );
};

export const useContract = (id: string) => {
  return useQuery(
    ['contract', id],
    () => contractService.getContract(id),
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
    }
  );
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();

  return useMutation(contractService.createContract, {
    onSuccess: (newContract) => {
      // Invalidate and refetch contracts list
      queryClient.invalidateQueries(['contracts']);
      
      // Add new contract to cache
      queryClient.setQueryData(['contract', newContract.id], newContract);
      
      // Show success notification
      toast.success('Contract created successfully!');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create contract');
    },
  });
};

export const useGenerateContract = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ contractId, regenerate }: { contractId: string; regenerate?: boolean }) =>
      contractService.generateContract(contractId, regenerate),
    {
      onSuccess: (aiGeneration, { contractId }) => {
        // Refresh contract data to show generated content
        queryClient.invalidateQueries(['contract', contractId]);
        toast.success('Contract content generated successfully!');
      },
      onError: (error: ApiError) => {
        toast.error(error.message || 'Failed to generate contract');
      },
    }
  );
};

export const useAnalyzeCompliance = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ contractId, forceReanalysis }: { contractId: string; forceReanalysis?: boolean }) =>
      contractService.analyzeCompliance(contractId, forceReanalysis),
    {
      onSuccess: (analysis, { contractId }) => {
        // Refresh contract data to show compliance scores
        queryClient.invalidateQueries(['contract', contractId]);
        
        if (analysis.overall_score >= 0.95) {
          toast.success('Contract meets UK legal compliance standards!');
        } else {
          toast.warning('Contract compliance needs attention');
        }
      },
      onError: (error: ApiError) => {
        toast.error(error.message || 'Failed to analyze compliance');
      },
    }
  );
};
```

### Contract Creation Wizard Component

```typescript
// components/ContractWizard.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const contractSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(200, 'Title too long'),
  contract_type: yup.string().required('Contract type is required'),
  plain_english_input: yup
    .string()
    .required('Requirements are required')
    .min(10, 'Please provide more detailed requirements'),
  client_name: yup.string().required('Client name is required'),
  client_email: yup.string().email('Invalid email format'),
  contract_value: yup.number().min(0, 'Value cannot be negative'),
});

type FormData = yup.InferType<typeof contractSchema>;

export const ContractWizard: React.FC<{ onComplete: (contract: Contract) => void }> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContract, setGeneratedContract] = useState<Contract | null>(null);

  const createContractMutation = useCreateContract();
  const generateContractMutation = useGenerateContract();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: yupResolver(contractSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Step 1: Create contract
      const contract = await createContractMutation.mutateAsync(data);
      setGeneratedContract(contract);
      setCurrentStep(2);

      // Step 2: Generate AI content
      setIsGenerating(true);
      await generateContractMutation.mutateAsync({
        contractId: contract.id,
        regenerate: false,
      });
      setIsGenerating(false);
      setCurrentStep(3);

      onComplete(contract);
    } catch (error) {
      setIsGenerating(false);
      console.error('Contract creation failed:', error);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contract Title
              </label>
              <input
                {...register('title')}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                placeholder="e.g., Professional Services Agreement - Q1 2025"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contract Type
              </label>
              <select
                {...register('contract_type')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="">Select contract type...</option>
                <option value="service_agreement">Service Agreement</option>
                <option value="employment_contract">Employment Contract</option>
                <option value="supplier_agreement">Supplier Agreement</option>
                <option value="nda">Non-Disclosure Agreement</option>
                <option value="terms_conditions">Terms & Conditions</option>
              </select>
              {errors.contract_type && (
                <p className="mt-1 text-sm text-red-600">{errors.contract_type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Plain English Requirements
              </label>
              <textarea
                {...register('plain_english_input')}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                placeholder="Describe your contract requirements in plain English..."
              />
              {errors.plain_english_input && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.plain_english_input.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Client Name
                </label>
                <input
                  {...register('client_name')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="Client company or person"
                />
                {errors.client_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.client_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Client Email (Optional)
                </label>
                <input
                  {...register('client_email')}
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="client@company.co.uk"
                />
                {errors.client_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.client_email.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!isValid || createContractMutation.isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createContractMutation.isLoading ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </form>
        );

      case 2:
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Generating Contract Content
            </h3>
            <p className="text-gray-600">
              Our AI is creating your professional UK legal contract...
            </p>
            <div className="mt-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Using OpenAI GPT-OSS-120B model for ultra-fast, compliant generation
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Contract Created Successfully!
            </h3>
            <p className="text-gray-600 mb-6">
              Your contract has been generated with AI-powered content.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => onComplete(generatedContract!)}
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Review Generated Contract
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {[1, 2, 3].map((step, index) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Contract Details</span>
          <span>AI Generation</span>
          <span>Complete</span>
        </div>
      </div>

      {renderStep()}
    </div>
  );
};
```

---

## Real-time Features

### WebSocket Integration (Future Enhancement)

```typescript
// services/websocketService.ts
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  constructor(private url: string) {}

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`${this.url}?token=${token}`);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'ai_generation_complete':
        this.notifyAIGenerationComplete(message.data);
        break;
      case 'compliance_analysis_complete':
        this.notifyComplianceComplete(message.data);
        break;
      case 'contract_updated':
        this.notifyContractUpdated(message.data);
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        // this.connect(getCurrentToken());
      }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Event handlers to be implemented by consuming code
  private notifyAIGenerationComplete(data: any): void {
    // Dispatch custom event or call callback
    window.dispatchEvent(new CustomEvent('aiGenerationComplete', { detail: data }));
  }

  private notifyComplianceComplete(data: any): void {
    window.dispatchEvent(new CustomEvent('complianceAnalysisComplete', { detail: data }));
  }

  private notifyContractUpdated(data: any): void {
    window.dispatchEvent(new CustomEvent('contractUpdated', { detail: data }));
  }
}
```

### Real-time Contract Updates Hook

```typescript
// hooks/useRealTimeContract.ts
export const useRealTimeContract = (contractId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleAIGenerationComplete = (event: CustomEvent) => {
      if (event.detail.contract_id === contractId) {
        // Refresh contract data
        queryClient.invalidateQueries(['contract', contractId]);
        
        // Show notification
        toast.success('AI generation complete!');
      }
    };

    const handleComplianceComplete = (event: CustomEvent) => {
      if (event.detail.contract_id === contractId) {
        queryClient.invalidateQueries(['contract', contractId]);
        toast.success('Compliance analysis complete!');
      }
    };

    window.addEventListener('aiGenerationComplete', handleAIGenerationComplete as EventListener);
    window.addEventListener('complianceAnalysisComplete', handleComplianceComplete as EventListener);

    return () => {
      window.removeEventListener('aiGenerationComplete', handleAIGenerationComplete as EventListener);
      window.removeEventListener('complianceAnalysisComplete', handleComplianceComplete as EventListener);
    };
  }, [contractId, queryClient]);
};
```

---

## Error Handling

### Comprehensive Error Management

```typescript
// utils/errorHandler.ts
export class ErrorHandler {
  static handle(error: ApiError | Error): void {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          this.handleAuthenticationError(error);
          break;
        case 403:
          this.handleAuthorizationError(error);
          break;
        case 429:
          this.handleRateLimitError(error);
          break;
        case 500:
          this.handleServerError(error);
          break;
        default:
          this.handleGenericError(error);
      }
    } else {
      this.handleUnknownError(error);
    }
  }

  private static handleAuthenticationError(error: ApiError): void {
    toast.error('Please log in to continue');
    // Redirect to login
    window.location.href = '/login';
  }

  private static handleAuthorizationError(error: ApiError): void {
    toast.error('You do not have permission to perform this action');
  }

  private static handleRateLimitError(error: ApiError): void {
    toast.error('Too many requests. Please wait and try again.');
  }

  private static handleServerError(error: ApiError): void {
    toast.error('Server error. Please try again later.');
    
    // Log to monitoring service
    if (window.Sentry) {
      window.Sentry.captureException(error);
    }
  }

  private static handleGenericError(error: ApiError): void {
    toast.error(error.message || 'An unexpected error occurred');
  }

  private static handleUnknownError(error: Error): void {
    console.error('Unknown error:', error);
    toast.error('An unexpected error occurred');
  }
}

// Global error boundary for React
export class GlobalErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Global error boundary caught error:', error, errorInfo);
    
    // Log to monitoring service
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-sm text-gray-600 mb-4">
                An unexpected error occurred. Please refresh the page or contact support if the problem persists.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## State Management

### Redux Toolkit Integration (Alternative to React Query)

```typescript
// store/contractSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchContracts = createAsyncThunk(
  'contracts/fetchContracts',
  async (params: { page?: number; size?: number; filters?: ContractFilter }) => {
    const response = await contractService.getContracts(
      params.page,
      params.size,
      params.filters
    );
    return response;
  }
);

export const createContract = createAsyncThunk(
  'contracts/createContract',
  async (contractData: ContractCreate) => {
    const contract = await contractService.createContract(contractData);
    return contract;
  }
);

export const generateContractContent = createAsyncThunk(
  'contracts/generateContent',
  async ({ contractId, regenerate = false }: { contractId: string; regenerate?: boolean }) => {
    const generation = await contractService.generateContract(contractId, regenerate);
    return { contractId, generation };
  }
);

// Slice
interface ContractState {
  contracts: Contract[];
  currentContract: Contract | null;
  pagination: {
    total: number;
    page: number;
    size: number;
    pages: number;
  };
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

const initialState: ContractState = {
  contracts: [],
  currentContract: null,
  pagination: { total: 0, page: 1, size: 20, pages: 0 },
  isLoading: false,
  isGenerating: false,
  error: null,
};

const contractSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    setCurrentContract: (state, action) => {
      state.currentContract = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateContractInList: (state, action) => {
      const index = state.contracts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.contracts[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contracts
      .addCase(fetchContracts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContracts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contracts = action.payload.items;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          size: action.payload.size,
          pages: action.payload.pages,
        };
      })
      .addCase(fetchContracts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch contracts';
      })
      
      // Create contract
      .addCase(createContract.fulfilled, (state, action) => {
        state.contracts.unshift(action.payload);
        state.currentContract = action.payload;
      })
      
      // Generate content
      .addCase(generateContractContent.pending, (state) => {
        state.isGenerating = true;
      })
      .addCase(generateContractContent.fulfilled, (state, action) => {
        state.isGenerating = false;
        // Update current contract if it's the one being generated
        if (state.currentContract?.id === action.payload.contractId) {
          // Contract will be refetched to get updated content
        }
      })
      .addCase(generateContractContent.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate content';
      });
  },
});

export const { setCurrentContract, clearError, updateContractInList } = contractSlice.actions;
export default contractSlice.reducer;

// Selectors
export const selectContracts = (state: RootState) => state.contracts.contracts;
export const selectCurrentContract = (state: RootState) => state.contracts.currentContract;
export const selectContractsLoading = (state: RootState) => state.contracts.isLoading;
export const selectGenerating = (state: RootState) => state.contracts.isGenerating;
export const selectContractsError = (state: RootState) => state.contracts.error;
```

---

## Performance Optimization

### Caching and Optimization Strategies

```typescript
// utils/cacheManager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, ttl = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// React Query optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      cacheTime: 900000, // 15 minutes
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Optimized contract list with virtual scrolling
export const VirtualizedContractList: React.FC<{
  contracts: Contract[];
  onContractSelect: (contract: Contract) => void;
}> = ({ contracts, onContractSelect }) => {
  const [virtualizer] = useVirtualizer({
    count: contracts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated item height
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const contract = contracts[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ContractListItem
                contract={contract}
                onClick={() => onContractSelect(contract)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## Testing Integration

### Frontend Integration Tests

```typescript
// __tests__/integration/contractApi.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useContracts, useCreateContract } from '../hooks/useContracts';

// Mock API client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../services/contractService', () => ({
  contractService: {
    getContracts: mockApiClient.get,
    createContract: mockApiClient.post,
    // ... other methods
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Contract API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useContracts', () => {
    it('should fetch contracts successfully', async () => {
      const mockContracts = {
        items: [
          {
            id: '1',
            title: 'Test Contract',
            status: 'draft',
            // ... other properties
          },
        ],
        total: 1,
        page: 1,
        size: 20,
        pages: 1,
      };

      mockApiClient.get.mockResolvedValue({ data: mockContracts });

      const { result } = renderHook(() => useContracts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items).toEqual(mockContracts.items);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/contracts'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(
        new ApiError('Network error', 500, 'NETWORK_ERROR')
      );

      const { result } = renderHook(() => useContracts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(ApiError);
    });
  });

  describe('useCreateContract', () => {
    it('should create contract and invalidate queries', async () => {
      const newContract = {
        id: '2',
        title: 'New Contract',
        status: 'draft',
      };

      mockApiClient.post.mockResolvedValue({ data: { contract: newContract } });

      const { result } = renderHook(() => useCreateContract(), {
        wrapper: createWrapper(),
      });

      const contractData = {
        title: 'New Contract',
        contract_type: 'service_agreement' as const,
        plain_english_input: 'Test requirements',
        client_name: 'Test Client',
      };

      result.current.mutate(contractData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/contracts/', contractData);
      expect(result.current.data).toEqual(newContract);
    });
  });
});
```

This comprehensive frontend integration guide provides everything needed to build a robust, production-ready frontend that seamlessly integrates with the Pactoria backend API.