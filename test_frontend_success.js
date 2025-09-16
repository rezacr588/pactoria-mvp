// Test the improved error handling with a working contract
const API_BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgxMjQ2NTEuNDE3MjQ4LCJzdWIiOiI1YjViMmY5NC04ZGU0LTRhMGMtODk2YS05M2ZhYjVmNTcxZTQifQ.bvHc7gUChK5I0v9jP6VK7YGHvtq3gVJmHl3jkEAtRo0';

async function testPDFExport(id) {
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

// Test with contract with content
testPDFExport('e6aac743-037f-47bd-812e-e5808d820688')
  .then(blob => {
    console.log('Success: PDF blob received with size:', blob.size);
  })
  .catch(error => {
    console.log('Error:', error.message);
  });

