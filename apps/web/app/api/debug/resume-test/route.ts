import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import fs from 'node:fs';
import path from 'node:path';
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { htmlToPdfBuffer } from "@/lib/pdf/renderPdf";

// This endpoint is for testing the resume generation functionality
// It helps diagnose issues with the PDF generation pipeline

export async function GET(req: NextRequest) {
  const traceId = logger.info("Debug resume test endpoint called");
  
  try {
    const results: Record<string, any> = {
      traceId,
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test 1: Check if test data directory exists
    const testDataDir = path.join(process.cwd(), 'test', 'data');
    results.tests.testDataDirectory = {
      exists: fs.existsSync(testDataDir),
      path: testDataDir
    };
    
    // Test 2: Check if sample PDF exists
    const samplePdfPath = path.join(testDataDir, '05-versions-space.pdf');
    results.tests.samplePdf = {
      exists: fs.existsSync(samplePdfPath),
      path: samplePdfPath
    };
    
    // Test 3: Try to read the sample PDF
    if (results.tests.samplePdf.exists) {
      try {
        const pdfBuffer = fs.readFileSync(samplePdfPath);
        results.tests.pdfRead = {
          success: true,
          sizeBytes: pdfBuffer.length
        };
        
        // Test 4: Try to parse the PDF
        try {
          const pdfData = await pdfParse(pdfBuffer);
          results.tests.pdfParse = {
            success: true,
            textLength: pdfData.text.length,
            textPreview: pdfData.text.substring(0, 100) + '...'
          };
        } catch (error: any) {
          results.tests.pdfParse = {
            success: false,
            error: error.message
          };
          logger.error("Failed to parse PDF", { path: samplePdfPath }, error);
        }
      } catch (error: any) {
        results.tests.pdfRead = {
          success: false,
          error: error.message
        };
        logger.error("Failed to read PDF file", { path: samplePdfPath }, error);
      }
    }
    
    // Test 5: Try HTML to PDF conversion
    try {
      const html = `<html><body><h1>Test PDF Generation</h1><p>This is a test PDF generated at ${new Date().toISOString()}</p></body></html>`;
      const pdfBuffer = await htmlToPdfBuffer(html);
      
      results.tests.htmlToPdf = {
        success: true,
        sizeBytes: pdfBuffer.length
      };
      
      try {
        // Save the test PDF for inspection
        const debugDir = path.join(process.cwd(), '..', '..', 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        
        const testPdfPath = path.join(debugDir, 'test-pdf.pdf');
        fs.writeFileSync(testPdfPath, pdfBuffer);
        results.tests.htmlToPdf.savedPath = testPdfPath;
      } catch (fsError) {
        logger.warn("Could not save test PDF", { error: fsError });
      }
      
    } catch (error: any) {
      results.tests.htmlToPdf = {
        success: false,
        error: error.message
      };
      logger.error("Failed to convert HTML to PDF", {}, error);
    }
    
    // Test 6: Check environment variables needed for AI
    const envVars = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GOOGLE_API_KEY',
      'OPENROUTER_API_KEY'
    ];
    
    results.tests.aiEnvironment = {
      variables: {}
    };
    
    envVars.forEach(envVar => {
      results.tests.aiEnvironment.variables[envVar] = {
        exists: !!process.env[envVar],
        length: process.env[envVar] ? process.env[envVar].length : 0
      };
    });
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    logger.critical("Debug resume test failed", {}, error);
    return NextResponse.json(
      { 
        error: "Debug resume test failed", 
        message: error.message,
        traceId
      },
      { status: 500 }
    );
  }
}
