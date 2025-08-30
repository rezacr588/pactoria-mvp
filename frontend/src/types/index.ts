export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  joinedAt: Date;
  lastActive: Date;
}

export interface ContractType {
  id: string;
  name: string;
  category: string;
  description: string;
  template: string;
}

export interface ComplianceScore {
  overall: number;
  gdprCompliance: number;
  employmentLaw: number;
  commercialTerms: number;
  consumerRights: number;
  issues: ComplianceIssue[];
}

export interface ComplianceIssue {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface RiskFactor {
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  score: number;
}

export interface RiskAssessment {
  overall: number;
  factors: RiskFactor[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface ContractParty {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'supplier' | 'partner' | 'employee';
  signatureStatus: 'pending' | 'signed' | 'declined';
  signedAt?: Date;
}

export interface ContractDeadline {
  id: string;
  title: string;
  type: 'renewal' | 'review' | 'termination' | 'payment' | 'delivery';
  date: Date;
  status: 'upcoming' | 'due' | 'overdue' | 'completed';
}

export interface Contract {
  id: string;
  name: string;
  type: ContractType;
  status: 'draft' | 'review' | 'approved' | 'signed' | 'active' | 'expired' | 'terminated';
  version: number;
  content?: string;
  tags: string[];
  parties: ContractParty[];
  deadlines: ContractDeadline[];
  complianceScore: ComplianceScore;
  riskAssessment: RiskAssessment;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  joinedAt: Date;
  lastActive: Date;
  signatureStatus?: 'pending' | 'signed' | 'declined';
  signedAt?: Date;
}

export interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  ukCompliant: boolean;
  sectors: string[];
  fields: TemplateField[];
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}