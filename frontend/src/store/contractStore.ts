import { create } from 'zustand';
import { 
  Contract, 
  ContractType, 
  ContractTemplate, 
  TeamMember
} from '../types';

interface ContractState {
  contracts: Contract[];
  contractTypes: ContractType[];
  templates: ContractTemplate[];
  teamMembers: TeamMember[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchContracts: () => Promise<void>;
  fetchContractTypes: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchTeamMembers: () => Promise<void>;
  createContract: (contractData: Partial<Contract>) => Promise<Contract>;
  updateContract: (id: string, updates: Partial<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
}

// Mock data
const mockContractTypes: ContractType[] = [
  {
    id: 'professional-services',
    name: 'Professional Services Agreement',
    category: 'Services',
    description: 'For consulting and professional service arrangements',
    template: 'professional-services-template'
  },
  {
    id: 'employment',
    name: 'Employment Contract',
    category: 'HR',
    description: 'Standard UK employment contract',
    template: 'employment-template'
  },
  {
    id: 'supplier',
    name: 'Supplier Agreement',
    category: 'Procurement',
    description: 'For goods and services procurement',
    template: 'supplier-template'
  },
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement',
    category: 'Legal',
    description: 'Confidentiality and NDA',
    template: 'nda-template'
  }
];

const mockTemplates: ContractTemplate[] = [
  {
    id: 'professional-services',
    name: 'Professional Services Agreement',
    category: 'Services',
    description: 'Comprehensive UK-compliant professional services contract',
    ukCompliant: true,
    sectors: ['Technology', 'Consulting', 'Marketing', 'Finance'],
    fields: [
      { id: 'client_name', name: 'clientName', type: 'text', label: 'Client Name', required: true },
      { id: 'service_description', name: 'serviceDescription', type: 'textarea', label: 'Service Description', required: true },
      { id: 'contract_value', name: 'contractValue', type: 'number', label: 'Contract Value (£)', required: true },
      { id: 'start_date', name: 'startDate', type: 'date', label: 'Start Date', required: true },
      { id: 'end_date', name: 'endDate', type: 'date', label: 'End Date', required: false }
    ]
  },
  {
    id: 'employment',
    name: 'Employment Contract',
    category: 'HR',
    description: 'Standard UK employment contract with all legal requirements',
    ukCompliant: true,
    sectors: ['All Sectors'],
    fields: [
      { id: 'employee_name', name: 'employeeName', type: 'text', label: 'Employee Name', required: true },
      { id: 'job_title', name: 'jobTitle', type: 'text', label: 'Job Title', required: true },
      { id: 'salary', name: 'salary', type: 'number', label: 'Annual Salary (£)', required: true },
      { id: 'start_date', name: 'startDate', type: 'date', label: 'Start Date', required: true },
      { id: 'employment_type', name: 'employmentType', type: 'select', label: 'Employment Type', required: true, options: ['Permanent', 'Fixed Term', 'Probationary'] }
    ]
  }
];

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@techcorp.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=3b82f6&color=fff',
    joinedAt: new Date('2024-01-15'),
    lastActive: new Date()
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael@techcorp.com',
    role: 'editor',
    avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=10b981&color=fff',
    joinedAt: new Date('2024-02-20'),
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: '3',
    name: 'Emma Wilson',
    email: 'emma@techcorp.com',
    role: 'viewer',
    avatar: 'https://ui-avatars.com/api/?name=Emma+Wilson&background=f59e0b&color=fff',
    joinedAt: new Date('2024-03-10'),
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
];

const mockContracts: Contract[] = [
  {
    id: '1',
    name: 'TechCorp Website Development',
    type: mockContractTypes[0],
    status: 'active',
    version: 2,
    content: 'This is a professional services agreement...',
    tags: ['web-development', 'high-priority', 'recurring'],
    parties: [
      {
        id: '1',
        name: 'TechCorp Ltd',
        email: 'contracts@techcorp.com',
        role: 'client',
        signatureStatus: 'signed',
        signedAt: new Date('2024-08-15')
      },
      {
        id: '2',
        name: 'Digital Solutions Ltd',
        email: 'hello@digitalsolutions.com',
        role: 'supplier',
        signatureStatus: 'signed',
        signedAt: new Date('2024-08-16')
      }
    ],
    deadlines: [
      {
        id: '1',
        title: 'Quarterly Review',
        type: 'review',
        date: new Date('2024-12-01'),
        status: 'upcoming'
      },
      {
        id: '2',
        title: 'Contract Renewal',
        type: 'renewal',
        date: new Date('2025-02-15'),
        status: 'upcoming'
      }
    ],
    complianceScore: {
      overall: 95,
      gdprCompliance: 98,
      employmentLaw: 90,
      commercialTerms: 95,
      consumerRights: 100,
      issues: []
    },
    riskAssessment: {
      overall: 25,
      factors: [
        {
          name: 'Payment Terms',
          description: 'Standard 30-day payment terms with established client',
          impact: 'low',
          likelihood: 'low',
          score: 15
        },
        {
          name: 'Scope Clarity',
          description: 'Well-defined scope with detailed specifications',
          impact: 'medium',
          likelihood: 'low',
          score: 20
        },
        {
          name: 'Delivery Timeline',
          description: 'Realistic timeline with buffer for testing',
          impact: 'medium',
          likelihood: 'low',
          score: 25
        }
      ],
      recommendations: [
        'Consider adding milestone-based payment terms',
        'Include change request process for scope modifications',
        'Add performance guarantees and SLAs'
      ],
      lastUpdated: new Date('2024-08-15')
    },
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-20'),
    createdBy: '1'
  },
  {
    id: '2',
    name: 'Marketing Consultant Agreement',
    type: mockContractTypes[0],
    status: 'review',
    version: 1,
    tags: ['marketing', 'consultant'],
    parties: [
      {
        id: '3',
        name: 'TechCorp Ltd',
        email: 'contracts@techcorp.com',
        role: 'client',
        signatureStatus: 'pending'
      },
      {
        id: '4',
        name: 'Jane Marketing Ltd',
        email: 'jane@janemarketing.com',
        role: 'supplier',
        signatureStatus: 'pending'
      }
    ],
    deadlines: [
      {
        id: '3',
        title: 'Contract Signature Due',
        type: 'review',
        date: new Date('2024-09-05'),
        status: 'due'
      }
    ],
    complianceScore: {
      overall: 87,
      gdprCompliance: 92,
      employmentLaw: 85,
      commercialTerms: 88,
      consumerRights: 85,
      issues: [
        {
          id: '1',
          category: 'Commercial Terms',
          severity: 'medium',
          description: 'Termination clause could be more specific about notice period',
          recommendation: 'Add explicit 30-day notice requirement for contract termination'
        }
      ]
    },
    riskAssessment: {
      overall: 45,
      factors: [
        {
          name: 'New Supplier',
          description: 'First time working with this marketing consultant',
          impact: 'medium',
          likelihood: 'medium',
          score: 50
        },
        {
          name: 'Performance Metrics',
          description: 'Limited measurable KPIs defined',
          impact: 'medium',
          likelihood: 'medium',
          score: 40
        }
      ],
      recommendations: [
        'Request references from previous clients',
        'Define specific performance metrics and KPIs',
        'Consider a shorter initial contract period'
      ],
      lastUpdated: new Date('2024-08-25')
    },
    createdAt: new Date('2024-08-25'),
    updatedAt: new Date('2024-08-25'),
    createdBy: '1'
  },
  {
    id: '3',
    name: 'Employee Contract - John Smith',
    type: mockContractTypes[1],
    status: 'signed',
    version: 1,
    tags: ['employee', 'permanent'],
    parties: [
      {
        id: '5',
        name: 'TechCorp Ltd',
        email: 'hr@techcorp.com',
        role: 'client',
        signatureStatus: 'signed',
        signedAt: new Date('2024-07-01')
      },
      {
        id: '6',
        name: 'John Smith',
        email: 'john.smith@email.com',
        role: 'employee',
        signatureStatus: 'signed',
        signedAt: new Date('2024-07-02')
      }
    ],
    deadlines: [
      {
        id: '4',
        title: 'Probation Review',
        type: 'review',
        date: new Date('2024-10-01'),
        status: 'upcoming'
      }
    ],
    complianceScore: {
      overall: 98,
      gdprCompliance: 100,
      employmentLaw: 98,
      commercialTerms: 95,
      consumerRights: 100,
      issues: []
    },
    riskAssessment: {
      overall: 15,
      factors: [
        {
          name: 'Employment Law Compliance',
          description: 'Fully compliant with UK employment law',
          impact: 'low',
          likelihood: 'low',
          score: 10
        },
        {
          name: 'Probation Period',
          description: 'Standard 3-month probation period included',
          impact: 'low',
          likelihood: 'low',
          score: 20
        }
      ],
      recommendations: [
        'Schedule probation review meeting',
        'Ensure all required employee documentation is collected'
      ],
      lastUpdated: new Date('2024-07-01')
    },
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-07-01'),
    createdBy: '1'
  }
];

export const useContractStore = create<ContractState>((set, get) => ({
  contracts: [],
  contractTypes: [],
  templates: [],
  teamMembers: [],
  isLoading: false,
  error: null,

  fetchContracts: async () => {
    set({ isLoading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ contracts: mockContracts, isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
    }
  },

  fetchContractTypes: async () => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      set({ contractTypes: mockContractTypes, isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
    }
  },

  fetchTemplates: async () => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      set({ templates: mockTemplates, isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
    }
  },

  fetchTeamMembers: async () => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      set({ teamMembers: mockTeamMembers, isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
    }
  },

  createContract: async (contractData: Partial<Contract>) => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newContract: Contract = {
        id: Date.now().toString(),
        name: contractData.name || 'New Contract',
        type: contractData.type || mockContractTypes[0],
        status: 'draft',
        version: 1,
        tags: contractData.tags || [],
        parties: contractData.parties || [],
        deadlines: contractData.deadlines || [],
        complianceScore: {
          overall: 85,
          gdprCompliance: 90,
          employmentLaw: 85,
          commercialTerms: 80,
          consumerRights: 90,
          issues: []
        },
        riskAssessment: {
          overall: 35,
          factors: [
            {
              name: 'New Contract',
              description: 'Newly created contract requires review',
              impact: 'medium',
              likelihood: 'low',
              score: 35
            }
          ],
          recommendations: ['Complete compliance review', 'Define clear terms and conditions'],
          lastUpdated: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '1',
        ...contractData
      };

      const contracts = [...get().contracts, newContract];
      set({ contracts, isLoading: false });
      return newContract;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
      throw error;
    }
  },

  updateContract: async (id: string, updates: Partial<Contract>) => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const contracts = get().contracts.map(contract => 
        contract.id === id 
          ? { ...contract, ...updates, updatedAt: new Date() }
          : contract
      );
      
      set({ contracts, isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
    }
  },

  deleteContract: async (id: string) => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const contracts = get().contracts.filter(contract => contract.id !== id);
      set({ contracts, isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', isLoading: false });
    }
  }
}));