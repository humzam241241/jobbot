import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate text using Google's Gemini models
 * @param options Generation options
 * @returns Generated text and usage information
 */
export async function generateWithGoogle({
  system,
  user,
  model = "gemini-2.5-pro",
  safety = "standard",
  jsonSchema
}: {
  system?: string;
  user: string;
  model?: string;
  safety?: "standard" | "high" | "low";
  jsonSchema?: any;
}): Promise<{ 
  text: string; 
  usage?: { 
    inputTokens?: number; 
    outputTokens?: number;
    estimatedTokens?: number;
  } 
}> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  // Combine system and user prompts
  const prompt = system 
    ? `${system}\n\n${user}`
    : user;

  // Set safety settings based on the safety parameter
  const safetySettings = safety === "high" 
    ? [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    : safety === "low"
    ? [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ]
    : undefined; // Standard safety

  try {
    let response;

    // If JSON schema is provided, try to use responseSchema
    if (jsonSchema) {
      try {
        // Try with responseSchema for Gemini 2.5+ models
        if (model.includes('gemini-2.5')) {
          response = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseSchema: jsonSchema,
            },
            safetySettings
          });
        } else {
          // Fall back to responseMimeType for older models
          response = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON matching the schema below:\n${JSON.stringify(jsonSchema)}`}] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
            safetySettings
          });
        }
      } catch (schemaError) {
        // If schema methods fail, fall back to basic approach with explicit instructions
        console.warn("JSON schema features failed, falling back to basic prompt", schemaError);
        response = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown, no code fences, no commentary.\nSchema: ${JSON.stringify(jsonSchema)}`}] }],
          safetySettings
        });
      }
    } else {
      // Standard text generation without JSON schema
      response = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        safetySettings
      });
    }

    const text = response.response.text();
    
    // Get token usage if available from the API
    const usageMetadata = response.response.usageMetadata;
    const promptTokenCount = usageMetadata?.promptTokenCount;
    const candidatesTokenCount = usageMetadata?.candidatesTokenCount;
    const totalTokenCount = usageMetadata?.totalTokenCount;
    
    // If we don't have token counts, estimate based on text length
    if (!totalTokenCount) {
      const estimatedTokens = Math.ceil((prompt.length + text.length) / 4); // ~4 chars per token
      return { 
        text, 
        usage: { estimatedTokens } 
      };
    }
    
    return { 
      text, 
      usage: { 
        inputTokens: promptTokenCount, 
        outputTokens: candidatesTokenCount,
        estimatedTokens: totalTokenCount
      } 
    };
  } catch (error: any) {
    // Enhance error with more context
    const enhancedError = new Error(
      `Google Gemini API error: ${error.message || 'Unknown error'}`
    );
    (enhancedError as any).code = 'GEMINI_API_ERROR';
    (enhancedError as any).originalError = error;
    throw enhancedError;
  }
}
