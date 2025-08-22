// apps/web/tests/json-extractor.test.ts
import { describe, it, expect } from 'vitest';
import { extractLargestJsonObject } from '../lib/llm/json';

describe('JSON Extractor', () => {
  it('should extract JSON from clean JSON string', () => {
    const input = '{"name":"John","age":30,"city":"New York"}';
    const result = extractLargestJsonObject(input);
    
    expect(result).toBe(input);
  });
  
  it('should extract JSON from string with markdown code fences', () => {
    const input = '```json\n{"name":"John","age":30,"city":"New York"}\n```';
    const expected = '{"name":"John","age":30,"city":"New York"}';
    const result = extractLargestJsonObject(input);
    
    expect(result).toBe(expected);
  });
  
  it('should extract JSON from string with text before and after', () => {
    const input = 'Here is the JSON response:\n\n{"name":"John","age":30,"city":"New York"}\n\nI hope this helps!';
    const expected = '{"name":"John","age":30,"city":"New York"}';
    const result = extractLargestJsonObject(input);
    
    expect(result).toBe(expected);
  });
  
  it('should extract the largest JSON object when multiple are present', () => {
    const input = '{"small":"object"} and {"larger":"object","with":"more","properties":true}';
    const expected = '{"larger":"object","with":"more","properties":true}';
    const result = extractLargestJsonObject(input);
    
    expect(result).toBe(expected);
  });
  
  it('should handle nested JSON objects correctly', () => {
    const input = '{"person":{"name":"John","details":{"age":30,"city":"New York"}}}';
    const result = extractLargestJsonObject(input);
    
    expect(result).toBe(input);
  });
  
  it('should return original text if no JSON object is found', () => {
    const input = 'This is just plain text with no JSON structure';
    const result = extractLargestJsonObject(input);
    
    expect(result).toBe(input);
  });
});