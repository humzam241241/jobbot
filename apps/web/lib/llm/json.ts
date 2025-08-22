// apps/web/lib/llm/json.ts
import "server-only";
import { jsonrepair } from "jsonrepair";
import type { JSONSchema7 } from 'json-schema';
import { env } from "../env";

type JsonResult<T> = { json: T; raw: string; provider: string; model: string };

/**
 * Extracts the largest JSON object from a text string
 * @param text Text that may contain JSON
 * @returns The largest {...} block found, or the original text if none found
 */
export function extractLargestJsonObject(text: string): string {
  // naive but robust: find largest {...} block
  let best = '', depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') { 
      if (depth === 0) start = i; 
      depth++; 
    }
    else if (c === '}') { 
      depth--; 
      if (depth === 0 && start >= 0) { 
        const cand = text.slice(start, i + 1); 
        if (cand.length > best.length) best = cand; 
        start = -1; 
      } 
    }
  }
  return best || text;
}

/**
 * Calls an LLM and ensures it returns valid JSON
 * @param options Call parameters
 * @returns JSON result with parsed data, raw text, and provider info
 * @throws Error if JSON parsing fails after retries
 */
export async function callJSON<T>(
  {provider, model, schema, messages, temperature = 0.2}:
  {
    provider: 'openai' | 'anthropic' | 'gemini', 
    model: string, 
    schema: JSONSchema7, 
    messages: {role: 'system' | 'user' | 'assistant', content: string}[], 
    temperature?: number
  }
): Promise<JsonResult<T>> {
  const sys = { 
    role: 'system' as const, 
    content: `You must return ONLY a single JSON object that validates this JSON Schema. No markdown, no code fences, no commentary.` 
  };

  const attempt = async () => {
    if (provider === 'openai') {
      // OPENAI
      const { OpenAI } = await import("openai");
      
      if (!env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not set");
      }

      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY
      });

      const res = await openai.chat.completions.create({
        model, 
        temperature,
        response_format: { type: 'json_object' },
        messages: [sys, ...messages],
      });
      return res.choices[0]?.message?.content ?? '';
    } else if (provider === 'anthropic') {
      // ANTHROPIC
      const { Anthropic } = await import("@anthropic-ai/sdk");
      
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key is not set");
      }

      const anthropic = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY
      });

      // Check if the model supports JSON schema and tools
      const supportsJsonSchema = model.includes("claude-3");
      const supportsTools = model.includes("claude-3-5") || model.includes("claude-3-opus") || model.includes("claude-3-sonnet");
      
      try {
        // Try using tools API for Claude 3.5 and newer models
        if (supportsTools) {
          const response = await anthropic.messages.create({
            model,
            system: sys.content,
            messages: messages.map(m => ({ role: m.role as any, content: m.content })),
            max_tokens: 4000,
            temperature,
            tools: [
              {
                name: "json_output",
                description: "Output JSON data according to the specified schema",
                input_schema: schema
              }
            ]
          });

          // Check for tool calls in the response
          const toolCall = response.content.find(c => c.type === 'tool_use');
          if (toolCall && toolCall.type === 'tool_use') {
            return JSON.stringify(toolCall.input);
          }

          // Fallback to text content if no tool call
          return response.content.filter(c => c.type === 'text').map(c => c.text).join('');
        }
        
        // Fallback to JSON response format for other Claude 3 models
        if (supportsJsonSchema) {
          const response = await anthropic.messages.create({
            model,
            system: sys.content,
            messages: messages.map(m => ({ role: m.role as any, content: m.content })),
            max_tokens: 4000,
            temperature,
            response_format: {
              type: "json_object"
            }
          });

          return response.content.filter(c => c.type === 'text').map(c => c.text).join('');
        } 
        
        // Fallback for older models that don't support JSON schema
        const response = await anthropic.messages.create({
          model,
          system: sys.content,
          messages: messages.map(m => ({ role: m.role as any, content: m.content })),
          max_tokens: 4000,
          temperature
        });

        return response.content.filter(c => c.type === 'text').map(c => c.text).join('');
      } catch (error) {
        // If there's an error with response_format or tools, try again without them
        if (String(error).includes("response_format") || String(error).includes("tools")) {
          console.warn(`Anthropic API error with advanced features, retrying with basic approach for ${model}`);
          
          const response = await anthropic.messages.create({
            model,
            system: sys.content,
            messages: messages.map(m => ({ role: m.role as any, content: m.content })),
            max_tokens: 4000,
            temperature
          });

          return response.content.filter(c => c.type === 'text').map(c => c.text).join('');
        }
        
        throw error;
      }
    } else {
      // GEMINI
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      
      if (!env.GEMINI_API_KEY) {
        throw new Error("Gemini API key is not set");
      }

      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model });

      // Combine all messages into a single content array
      const allMessages = [
        { role: "user", parts: [{ text: sys.content }] },
        ...messages.map(m => ({ 
          role: m.role === "system" ? "user" : m.role as "user" | "model", 
          parts: [{ text: m.content }] 
        }))
      ];
      
      try {
        // Try with responseMimeType for JSON
        const response = await geminiModel.generateContent({
          contents: allMessages,
          generationConfig: {
            maxOutputTokens: 4000,
            temperature,
            responseMimeType: "application/json"
          }
        });

        return response.response.text();
      } catch (error) {
        // If there's an error with responseMimeType, try again without it
        if (String(error).includes("responseMimeType") || String(error).includes("mime")) {
          console.warn("Gemini API error with responseMimeType, retrying without it");
          
          // For Gemini 2.5, try with responseSchema if available
          try {
            if (model.includes("gemini-2.5")) {
              const response = await geminiModel.generateContent({
                contents: allMessages,
                generationConfig: {
                  maxOutputTokens: 4000,
                  temperature,
                  responseSchema: schema
                }
              });
              
              return response.response.text();
            }
          } catch (schemaError) {
            console.warn("Gemini API error with responseSchema, falling back to basic approach");
          }
          
          // Basic approach without special JSON formatting
          const response = await geminiModel.generateContent({
            contents: allMessages,
            generationConfig: {
              maxOutputTokens: 4000,
              temperature
            }
          });

          return response.response.text();
        }
        
        throw error;
      }
    }
  };

  let lastRaw = '';
  for (let i = 0; i < 3; i++) {
    try {
      lastRaw = await attempt();
      const body = extractLargestJsonObject(lastRaw).trim();
      try {
        const obj = JSON.parse(body);
        // TODO: validate against schema here if you have a validator
        return { json: obj as T, raw: lastRaw, provider, model };
      } catch(e) {
        if (i < 2) { // Only log for retries, not the final attempt
          console.warn(`JSON parse failed (attempt ${i+1}/3), retrying...`);
          await new Promise(r => setTimeout(r, 200 * (i + 1)));
        }
      }
    } catch (e) {
      if (String(e).includes('API key')) {
        throw e; // Don't retry API key errors
      }
      
      if (i < 2) {
        console.warn(`LLM API error (attempt ${i+1}/3): ${e instanceof Error ? e.message : String(e)}`);
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      } else {
        throw e; // Re-throw on final attempt
      }
    }
  }
  
  const preview = lastRaw.slice(0, 800);
  const err: any = new Error('LLM_JSON_PARSE_FAILED'); 
  err.code = 'LLM_JSON_PARSE_FAILED'; 
  err.preview = preview; 
  err.provider = provider; 
  err.model = model;
  throw err;
}