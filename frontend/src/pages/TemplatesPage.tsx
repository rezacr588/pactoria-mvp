import { useState } from 'react';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  HeartIcon,
  ShieldCheckIcon,
  ClockIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { classNames } from '../utils/classNames';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'employment' | 'commercial' | 'property' | 'corporate' | 'consumer' | 'ip';
  subcategory: string;
  type: 'contract' | 'agreement' | 'letter' | 'form' | 'policy';
  jurisdiction: 'england-wales' | 'scotland' | 'northern-ireland' | 'uk-wide';
  lastUpdated: string;
  version: string;
  complianceScore: number;
  usageCount: number;
  isFavorite: boolean;
  isPopular: boolean;
  tags: string[];
  previewText: string;
  estimatedTime: number; // minutes to complete
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author: {
    name: string;
    role: string;
  };
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Employment Contract - Permanent Full-Time',
    description: 'Comprehensive employment contract template for permanent full-time employees in England & Wales',
    category: 'employment',
    subcategory: 'Permanent Employment',
    type: 'contract',
    jurisdiction: 'england-wales',
    lastUpdated: '2025-08-15',
    version: '2.1',
    complianceScore: 98,
    usageCount: 245,
    isFavorite: true,
    isPopular: true,
    tags: ['GDPR Compliant', 'Working Time Regulations', 'Statutory Rights'],
    previewText: 'This Employment Agreement is made between [Company Name] and [Employee Name]...',
    estimatedTime: 25,
    difficulty: 'intermediate',
    author: { name: 'Legal Team', role: 'Employment Specialist' }
  },
  {
    id: '2',
    name: 'Professional Services Agreement',
    description: 'Standard agreement for professional services with IP protection and liability clauses',
    category: 'commercial',
    subcategory: 'Service Agreements',
    type: 'agreement',
    jurisdiction: 'uk-wide',
    lastUpdated: '2025-08-20',
    version: '3.0',
    complianceScore: 96,
    usageCount: 189,
    isFavorite: false,
    isPopular: true,
    tags: ['IP Protection', 'Liability Limitation', 'Payment Terms'],
    previewText: 'This Professional Services Agreement governs the provision of services by...',
    estimatedTime: 30,
    difficulty: 'advanced',
    author: { name: 'Commercial Team', role: 'Contract Specialist' }
  },
  {
    id: '3',
    name: 'Non-Disclosure Agreement (NDA)',
    description: 'Mutual NDA template for protecting confidential information between parties',
    category: 'commercial',
    subcategory: 'Confidentiality',
    type: 'agreement',
    jurisdiction: 'uk-wide',
    lastUpdated: '2025-08-10',
    version: '1.5',
    complianceScore: 95,
    usageCount: 567,
    isFavorite: true,
    isPopular: true,
    tags: ['Confidentiality', 'Trade Secrets', 'Mutual Protection'],
    previewText: 'This Non-Disclosure Agreement is entered into by and between...',
    estimatedTime: 15,
    difficulty: 'beginner',
    author: { name: 'Legal Team', role: 'Privacy Specialist' }
  },
  {
    id: '4',
    name: 'Supplier Agreement Template',
    description: 'Comprehensive supplier agreement with quality standards and delivery terms',
    category: 'commercial',
    subcategory: 'Supply Chain',
    type: 'agreement',
    jurisdiction: 'england-wales',
    lastUpdated: '2025-07-28',
    version: '2.3',
    complianceScore: 94,
    usageCount: 156,
    isFavorite: false,
    isPopular: false,
    tags: ['Quality Standards', 'Delivery Terms', 'Performance KPIs'],
    previewText: 'This Supplier Agreement sets out the terms for the supply of goods/services...',
    estimatedTime: 35,
    difficulty: 'advanced',
    author: { name: 'Procurement Team', role: 'Supply Chain Lead' }
  },
  {
    id: '5',
    name: 'Data Processing Agreement (DPA)',
    description: 'GDPR-compliant data processing agreement for third-party processors',
    category: 'consumer',
    subcategory: 'Data Protection',
    type: 'agreement',
    jurisdiction: 'uk-wide',
    lastUpdated: '2025-08-25',
    version: '4.1',
    complianceScore: 99,
    usageCount: 312,
    isFavorite: true,
    isPopular: true,
    tags: ['GDPR', 'Data Security', 'Processing Activities'],
    previewText: 'This Data Processing Agreement governs the processing of personal data...',
    estimatedTime: 20,
    difficulty: 'intermediate',
    author: { name: 'Privacy Team', role: 'Data Protection Officer' }
  },
  {
    id: '6',
    name: 'Commercial Lease Agreement',
    description: 'Standard commercial property lease with tenant protections',
    category: 'property',
    subcategory: 'Commercial Leases',
    type: 'agreement',
    jurisdiction: 'england-wales',
    lastUpdated: '2025-08-05',
    version: '1.8',
    complianceScore: 92,
    usageCount: 89,
    isFavorite: false,
    isPopular: false,
    tags: ['Rent Review', 'Repair Obligations', 'Assignment Rights'],
    previewText: 'This Lease Agreement is made between the Landlord and Tenant for...',
    estimatedTime: 45,
    difficulty: 'advanced',
    author: { name: 'Property Team', role: 'Real Estate Specialist' }
  }
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'employment', label: 'Employment' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'property', label: 'Property' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'ip', label: 'Intellectual Property' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'contract', label: 'Contracts' },
  { value: 'agreement', label: 'Agreements' },
  { value: 'letter', label: 'Letters' },
  { value: 'form', label: 'Forms' },
  { value: 'policy', label: 'Policies' },
];

const jurisdictionOptions = [
  { value: '', label: 'All Jurisdictions' },
  { value: 'uk-wide', label: 'UK-Wide' },
  { value: 'england-wales', label: 'England & Wales' },
  { value: 'scotland', label: 'Scotland' },
  { value: 'northern-ireland', label: 'Northern Ireland' },
];

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'compliance', label: 'Compliance Score' },
  { value: 'usage', label: 'Usage Count' },
];

function getCategoryColor(category: Template['category']) {
  switch (category) {
    case 'employment':
      return 'text-blue-700 bg-blue-100';
    case 'commercial':
      return 'text-green-700 bg-green-100';
    case 'property':
      return 'text-purple-700 bg-purple-100';
    case 'corporate':
      return 'text-orange-700 bg-orange-100';
    case 'consumer':
      return 'text-red-700 bg-red-100';
    case 'ip':
      return 'text-indigo-700 bg-indigo-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function getDifficultyColor(difficulty: Template['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'intermediate':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'advanced':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getJurisdictionLabel(jurisdiction: Template['jurisdiction']) {
  switch (jurisdiction) {
    case 'uk-wide':
      return 'UK-Wide';
    case 'england-wales':
      return 'England & Wales';
    case 'scotland':
      return 'Scotland';
    case 'northern-ireland':
      return 'Northern Ireland';
    default:
      return jurisdiction;
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  // View mode can be implemented later if needed
  // const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter templates
  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !categoryFilter || template.category === categoryFilter;
      const matchesType = !typeFilter || template.type === typeFilter;
      const matchesJurisdiction = !jurisdictionFilter || template.jurisdiction === jurisdictionFilter;

      return matchesSearch && matchesCategory && matchesType && matchesJurisdiction;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.usageCount - a.usageCount;
        case 'recent':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'compliance':
          return b.complianceScore - a.complianceScore;
        case 'usage':
          return b.usageCount - a.usageCount;
        default:
          return 0;
      }
    });

  const toggleFavorite = (id: string) => {
    setTemplates(prev => prev.map(template =>
      template.id === id ? { ...template, isFavorite: !template.isFavorite } : template
    ));
  };

  const favoriteTemplates = templates.filter(t => t.isFavorite);
  const popularTemplates = templates.filter(t => t.isPopular);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">UK Legal Templates</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Professional, compliant contract templates for UK businesses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<DocumentTextIcon className="h-4 w-4" />}
          >
            Request Template
          </Button>
          <Button
            variant="primary"
            icon={<PlusIcon className="h-4 w-4" />}
          >
            Create Custom
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 mb-8">
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Templates</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{templates.length}</p>
            </div>
            <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Popular</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{popularTemplates.length}</p>
            </div>
            <StarSolidIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Favorites</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{favoriteTemplates.length}</p>
            </div>
            <HeartSolidIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Avg. Compliance</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">96%</p>
            </div>
            <ShieldCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <Input
              placeholder="Search templates..."
              leftIcon={<MagnifyingGlassIcon />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            placeholder="Category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
          <Select
            placeholder="Type"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
          <Select
            placeholder="Jurisdiction"
            options={jurisdictionOptions}
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
          />
          <Select
            placeholder="Sort by"
            options={sortOptions}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          />
        </div>
      </Card>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {filteredTemplates.length} of {templates.length} templates
        </p>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} variant="bordered" className="flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={classNames('text-xs', getCategoryColor(template.category))}>
                        {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                      </Badge>
                      {template.isPopular && (
                        <StarSolidIcon className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {template.description}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(template.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {template.isFavorite ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Compliance Score</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${template.complianceScore}%` }}
                        />
                      </div>
                      <span className="font-medium text-green-600">{template.complianceScore}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Jurisdiction</span>
                    <span className="font-medium">{getJurisdictionLabel(template.jurisdiction)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Est. Time</span>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{template.estimatedTime}m</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Difficulty</span>
                    <span className={classNames(
                      'text-xs px-2 py-1 rounded border font-medium',
                      getDifficultyColor(template.difficulty)
                    )}>
                      {template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{template.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  <p className="mb-1">
                    <span className="font-medium">Updated:</span>{' '}
                    {new Date(template.lastUpdated).toLocaleDateString('en-GB')} (v{template.version})
                  </p>
                  <p>
                    <span className="font-medium">Used:</span> {template.usageCount} times
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 mt-auto">
                <div className="flex space-x-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    icon={<DocumentDuplicateIcon className="h-4 w-4" />}
                  >
                    Use Template
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<EyeIcon className="h-4 w-4" />}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<PencilIcon className="h-4 w-4" />}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}