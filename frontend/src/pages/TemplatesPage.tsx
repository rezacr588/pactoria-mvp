import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  HeartIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
} from '@heroicons/react/24/solid';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { classNames } from '../utils/classNames';
import { TemplateService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';
import { SkeletonGrid } from '../components/ui/Skeleton';
import TemplatePreviewModal from '../components/templates/TemplatePreviewModal';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  contract_type: string;
  template_content: string;
  compliance_features: string[];
  legal_notes?: string;
  version: string;
  is_active: boolean;
  suitable_for: string[];
  created_at: string;
  updated_at?: string;
  // UI state
  isFavorite?: boolean;
}






function getCategoryColor(category: string) {
  const lowerCategory = category.toLowerCase();
  switch (lowerCategory) {
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
    case 'intellectual property':
      return 'text-indigo-700 bg-indigo-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function getDifficultyFromFeatures(features: string[]) {
  // Determine difficulty based on compliance features
  if (features.length >= 5) return 'advanced';
  if (features.length >= 3) return 'intermediate';
  return 'beginner';
}

function getDifficultyColor(difficulty: string) {
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


export default function TemplatesPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [categories, setCategories] = useState<string[]>([]);
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    pages: 0
  });

  // Favorite templates state (stored locally)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Template preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('template-favorites');
    if (savedFavorites) {
      setFavoriteIds(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((favorites: Set<string>) => {
    localStorage.setItem('template-favorites', JSON.stringify(Array.from(favorites)));
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await TemplateService.getTemplates({
        page: pagination.page,
        size: pagination.size,
        contract_type: typeFilter || undefined,
        category: categoryFilter || undefined,
        search: searchQuery || undefined
      });
      
      setTemplates(response.templates);
      setPagination({
        page: response.page,
        size: response.size,
        total: response.total,
        pages: response.pages
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.size, typeFilter, categoryFilter, searchQuery, showToast]);

  // Use ref to store fetchTemplates to avoid infinite loop
  const fetchTemplatesRef = useRef(fetchTemplates);
  fetchTemplatesRef.current = fetchTemplates;

  // Fetch categories and contract types
  const fetchMetadata = useCallback(async () => {
    try {
      const [categoriesData, contractTypesData] = await Promise.all([
        TemplateService.getTemplateCategories(),
        TemplateService.getTemplateContractTypes()
      ]);
      setCategories(categoriesData);
      setContractTypes(contractTypesData);
    } catch (err) {
      console.warn('Failed to fetch template metadata:', err);
    }
  }, []);

  useEffect(() => {
    fetchTemplatesRef.current();
  }, [pagination.page, pagination.size, typeFilter, categoryFilter, searchQuery, fetchTemplatesRef]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Generate options for dropdowns
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(category => ({
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1)
    }))
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...contractTypes.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  ];

  const sortOptions = [
    { value: 'name', label: 'Name A-Z' },
    { value: 'category', label: 'Category' },
    { value: 'created_at', label: 'Recently Added' },
    { value: 'updated_at', label: 'Recently Updated' }
  ];

  // Filter and sort templates
  const filteredTemplates = templates
    .filter(template => template.is_active) // Only show active templates
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        default:
          return 0;
      }
    });

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favoriteIds);
    if (favoriteIds.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavoriteIds(newFavorites);
    saveFavorites(newFavorites);
  };

  const favoriteTemplates = templates.filter(t => favoriteIds.has(t.id));
  const activeTemplates = templates.filter(t => t.is_active);

  // Handle template preview
  const handlePreviewTemplate = (templateId: string) => {
    setPreviewTemplateId(templateId);
    setPreviewModalOpen(true);
  };

  // Handle closing preview modal
  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewTemplateId(null);
  };

  // Handle using template from preview
  const handleUseTemplate = (templateId: string) => {
    // Navigate to contract creation with this template
    window.location.href = `/contracts/new?template=${templateId}`;
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">UK Legal Templates</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Professional, compliant contract templates for UK businesses
          </p>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading templates</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Button
            onClick={fetchTemplates}
            className="mt-4"
            icon={<ArrowPathIcon className="h-4 w-4" />}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
            variant="primary"
            icon={<DocumentTextIcon className="h-4 w-4" />}
          >
            Request Template
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
              <p className="text-xs sm:text-sm font-medium text-gray-500">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{activeTemplates.length}</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
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
              <p className="text-xs sm:text-sm font-medium text-gray-500">Categories</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
            </div>
            <TagIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
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
          <div></div>
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
          Showing {filteredTemplates.length} of {pagination.total} templates
        </p>
        {pagination.pages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
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
          {filteredTemplates.map((template) => {
            const isFavorite = favoriteIds.has(template.id);
            const difficulty = getDifficultyFromFeatures(template.compliance_features);
            const complianceScore = Math.max(90, Math.min(100, 85 + template.compliance_features.length * 3)); // Estimate based on features
            
            return (
              <Card key={template.id} variant="bordered" className="flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={classNames('text-xs', getCategoryColor(template.category))}>
                          {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                        </Badge>
                        <Badge variant="default" className="text-xs">
                          v{template.version}
                        </Badge>
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
                      {isFavorite ? (
                        <HeartSolidIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <HeartIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Compliance Features</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${complianceScore}%` }}
                          />
                        </div>
                        <span className="font-medium text-green-600">{complianceScore}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Contract Type</span>
                      <span className="font-medium">{template.contract_type}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Features</span>
                      <span className="font-medium">{template.compliance_features.length} compliance features</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Complexity</span>
                      <span className={classNames(
                        'text-xs px-2 py-1 rounded border font-medium',
                        getDifficultyColor(difficulty)
                      )}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {template.compliance_features.slice(0, 3).map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {feature}
                        </span>
                      ))}
                      {template.compliance_features.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{template.compliance_features.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {template.suitable_for.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">Suitable for:</p>
                      <p className="text-xs text-gray-600">
                        {template.suitable_for.slice(0, 2).join(', ')}
                        {template.suitable_for.length > 2 && ` +${template.suitable_for.length - 2} more`}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    <p className="mb-1">
                      <span className="font-medium">Updated:</span>{' '}
                      {new Date(template.updated_at || template.created_at).toLocaleDateString('en-GB')}
                    </p>
                    <p>
                      <span className="font-medium">Version:</span> {template.version}
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
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<EyeIcon className="h-4 w-4" />}
                      onClick={() => handlePreviewTemplate(template.id)}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplateId && (
        <TemplatePreviewModal
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
          templateId={previewTemplateId}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}