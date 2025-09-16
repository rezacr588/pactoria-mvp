// Test the full flow with both improved frontend and backend
const API_BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgxMjQ2NTEuNDE3MjQ4LCJzdWIiOiI1YjViMmY5NC04ZGU0LTRhMGMtODk2YS05M2ZhYjVmNTcxZTQifQ.bvHc7gUChK5I0v9jP6VK7YGHvtq3gVJmHl3jkEAtRo0';

// Simulate the updated ContractService.exportContractPDF
async function exportContractPDF(id) {
  const response = await fetch(`${API_BASE_URL}/contracts/${id}/export/pdf`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  });

  if (!response.ok) {
    // Try to parse error details from response body
    let errorMessage = `Failed to export PDF: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (e) {
      // If JSON parsing fails, use the default message
    }
    throw new Error(errorMessage);
  }

  return response.blob();
}

// Simulate the updated handleExport function
async function simulateContractExport(contractId, hasContent) {
  console.log(`\n=== Testing export for contract ${contractId} (${hasContent ? 'with' : 'without'} content) ===`);
  
  try {
    const blob = await exportContractPDF(contractId);
    console.log('✅ Success: PDF blob received with size:', blob.size);
    
    // Simulate browser download
    console.log('✅ Would download file as: contract.pdf');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('💡 User would see this error message in alert dialog');
  }
}

// Test both scenarios
(async () => {
  // Test contract without content (should show helpful error)
  await simulateContractExport('5f4931b7-ce84-4953-89d9-aadd59b978fb', false);
  
  // Test contract with content (should succeed)
  await simulateContractExport('e6aac743-037f-47bd-812e-e5808d820688', true);
})();

