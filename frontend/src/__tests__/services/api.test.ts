import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  SearchService, 
  BulkService, 
  TemplateService, 
  WebSocketService 
} from '../../services/api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = mockLocalStorage as any;

describe('API Services', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock auth token
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        state: {
          token: 'mock-jwt-token'
        }
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SearchService', () => {
    it('should search contracts with proper request structure', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            title: 'Test Contract',
            contract_type: 'SERVICE_AGREEMENT',
            status: 'ACTIVE',
            created_at: '2024-01-01T00:00:00Z',
            version: 1
          }
        ],
        total: 1,
        page: 1,
        size: 20,
        took_ms: 150,
        query: 'test',
        filters_applied: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await SearchService.searchContracts({
        query: 'test',
        operator: 'AND',
        page: 1,
        size: 20
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/contracts'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify({
            query: 'test',
            operator: 'AND',
            page: 1,
            size: 20
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle quick search with query parameters', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        size: 20,
        took_ms: 50,
        query: 'service',
        filters_applied: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await SearchService.quickSearchContracts({
        q: 'service',
        status: 'ACTIVE',
        page: 1
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/contracts/quick?q=service&status=ACTIVE&page=1'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should get search suggestions', async () => {
      const mockResponse = {
        suggestions: ['service agreement', 'service contract'],
        query: 'service',
        total: 2
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await SearchService.getContractSearchSuggestions({
        q: 'service',
        limit: 5
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('BulkService', () => {
    it('should perform bulk update contracts', async () => {
      const mockResponse = {
        operation_type: 'bulk_update',
        total_requested: 2,
        success_count: 2,
        failed_count: 0,
        processing_time_ms: 500,
        updated_ids: ['1', '2']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await BulkService.bulkUpdateContracts({
        contract_ids: ['1', '2'],
        updates: {
          status: 'ACTIVE',
          client_name: 'New Client'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/bulk/contracts/update'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            contract_ids: ['1', '2'],
            updates: {
              status: 'ACTIVE',
              client_name: 'New Client'
            }
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should perform bulk delete contracts', async () => {
      const mockResponse = {
        operation_type: 'bulk_delete',
        total_requested: 1,
        success_count: 1,
        failed_count: 0,
        processing_time_ms: 200,
        deleted_ids: ['1']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await BulkService.bulkDeleteContracts({
        contract_ids: ['1'],
        deletion_reason: 'Test deletion'
      });

      expect(result.success_count).toBe(1);
      expect(result.deleted_ids).toEqual(['1']);
    });

    it('should perform bulk export contracts', async () => {
      const mockResponse = {
        export_id: 'export-123',
        format: 'CSV' as const,
        total_records: 10,
        download_url: 'https://example.com/download/export-123.csv',
        processing_time_ms: 1000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await BulkService.bulkExportContracts({
        contract_ids: Array.from({length: 10}, (_, i) => `${i + 1}`),
        format: 'CSV',
        fields: ['title', 'status', 'client_name']
      });

      expect(result.format).toBe('CSV');
      expect(result.total_records).toBe(10);
      expect(result.download_url).toBeTruthy();
    });
  });

  describe('TemplateService', () => {
    it('should get templates with pagination', async () => {
      const mockResponse = {
        templates: [
          {
            id: '1',
            name: 'Service Agreement',
            category: 'Commercial',
            contract_type: 'SERVICE_AGREEMENT',
            description: 'Standard service agreement template',
            template_content: 'Template content...',
            compliance_features: ['GDPR Compliant'],
            version: '1.0',
            is_active: true,
            suitable_for: ['SME', 'Enterprise'],
            created_at: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        size: 20,
        pages: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await TemplateService.getTemplates({
        page: 1,
        size: 20,
        category: 'Commercial'
      });

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].name).toBe('Service Agreement');
    });

    it('should create a new template', async () => {
      const mockTemplate = {
        id: 'new-template-id',
        name: 'New Template',
        category: 'Employment',
        contract_type: 'EMPLOYMENT_CONTRACT',
        description: 'New employment contract template',
        template_content: 'New template content...',
        compliance_features: ['Employment Law Compliant'],
        version: '1.0',
        is_active: true,
        suitable_for: ['All Companies'],
        created_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockTemplate)
      });

      const result = await TemplateService.createTemplate({
        name: 'New Template',
        category: 'Employment',
        contract_type: 'EMPLOYMENT_CONTRACT',
        description: 'New employment contract template',
        template_content: 'New template content...',
        compliance_features: ['Employment Law Compliant'],
        suitable_for: ['All Companies']
      });

      expect(result.id).toBe('new-template-id');
      expect(result.name).toBe('New Template');
    });

    it('should get template categories', async () => {
      const mockCategories = ['Employment', 'Commercial', 'Legal'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategories)
      });

      const result = await TemplateService.getTemplateCategories();
      expect(result).toEqual(mockCategories);
    });
  });

  describe('WebSocketService', () => {
    let wsService: WebSocketService;

    beforeEach(() => {
      wsService = new WebSocketService();
      
      // Mock WebSocket
      global.WebSocket = vi.fn().mockImplementation(() => ({
        close: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        readyState: WebSocket.OPEN
      }));
    });

    it('should initialize WebSocket service', () => {
      expect(wsService).toBeInstanceOf(WebSocketService);
    });

    it('should connect with token', () => {
      wsService.connect('test-token');
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://localhost:8000/api/v1/ws/connect?token=test-token')
      );
    });

    it('should check connection status', () => {
      const isConnected = wsService.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should get WebSocket stats', async () => {
      const mockStats = {
        websocket_stats: {
          active_connections: 5,
          uptime_seconds: 3600
        },
        generated_at: '2024-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats)
      });

      const result = await WebSocketService.getStats();
      expect(result.websocket_stats.active_connections).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        message: 'Bad Request',
        details: 'Invalid search parameters'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse)
      });

      await expect(SearchService.searchContracts({ query: '' }))
        .rejects
        .toThrow('Bad Request');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(SearchService.searchContracts({ query: 'test' }))
        .rejects
        .toThrow('Network error');
    });

    it('should handle 204 No Content responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('No content'))
      });

      const result = await TemplateService.deleteTemplate('test-id');
      expect(result).toEqual({});
    });
  });

  describe('Authentication', () => {
    it('should include Authorization header when token is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, size: 20, took_ms: 10, query: '', filters_applied: {} })
      });

      await SearchService.searchContracts({ query: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );
    });

    it('should work without Authorization header when no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, size: 20, took_ms: 10, query: '', filters_applied: {} })
      });

      await SearchService.searchContracts({ query: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });
});