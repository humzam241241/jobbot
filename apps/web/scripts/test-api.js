const fs = require('fs');
const path = require('path');
const { createLogger } = require('../lib/logger');

const logger = createLogger('test-api');

// Mock Next.js Response
class MockResponse {
  constructor() {
    this.status = 200;
    this.headers = new Map();
    this.body = null;
  }
  
  json(data) {
    this.body = data;
    return this;
  }
  
  status(code) {
    this.status = code;
    return this;
  }
  
  setHeader(name, value) {
    this.headers.set(name, value);
    return this;
  }
}

// Mock Next.js Request
class MockRequest {
  constructor(body) {
    this.body = body;
  }
  
  async json() {
    return this.body;
  }
  
  async formData() {
    const formData = new FormData();
    Object.entries(this.body).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  }
}

// Create a simple test PDF
async function createTestPdf() {
  const testDir = path.join(__dirname, '../test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const testPdfPath = path.join(testDir, 'test.pdf');
  if (!fs.existsSync(testPdfPath)) {
    // Create a simple PDF file (this is just a placeholder)
    fs.writeFileSync(testPdfPath, 'PDF placeholder');
  }
  
  return testPdfPath;
}

// Test the API route
async function testApi() {
  try {
    logger.info('Testing API route...');
    
    // Create test PDF
    const testPdfPath = await createTestPdf();
    const pdfBuffer = fs.readFileSync(testPdfPath);
    
    // Mock request with form data
    const mockRequest = {
      formData: async () => {
        const formData = new Map();
        formData.set('resume', {
          arrayBuffer: async () => pdfBuffer,
          type: 'application/pdf',
          size: pdfBuffer.length
        });
        formData.set('jobDescription', 'Looking for a software engineer with React, Node.js, and AWS experience');
        formData.set('provider', 'Google');
        formData.set('model', 'Gemini 2.5 Pro');
        
        return {
          get: (key) => formData.get(key)
        };
      }
    };
    
    // Mock response
    const mockResponse = {
      json: (data) => {
        logger.info('Response received', { data });
        return { status: 200 };
      }
    };
    
    // Import the API route
    logger.info('Importing API route...');
    const { POST } = require('../app/api/resume/generate/route');
    
    // Call the API route
    logger.info('Calling API route...');
    const response = await POST(mockRequest);
    
    logger.info('API test completed');
  } catch (error) {
    logger.error('Error testing API', { error });
  }
}

// Run the test
testApi();
