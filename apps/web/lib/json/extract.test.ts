import { extractFirstJson } from './extract';

describe('extractFirstJson', () => {
  it('should extract JSON from fenced blocks', () => {
    const input = 'Some text\n```json\n{"foo": "bar"}\n```\nMore text';
    expect(extractFirstJson(input)).toBe('{"foo": "bar"}');
  });

  it('should extract unfenced JSON', () => {
    const input = 'Some text\n{"foo": "bar"}\nMore text';
    expect(extractFirstJson(input)).toBe('{"foo": "bar"}');
  });

  it('should extract nested JSON', () => {
    const input = 'Some text\n{"foo": {"nested": "value"}}\nMore text';
    expect(extractFirstJson(input)).toBe('{"foo": {"nested": "value"}}');
  });

  it('should ignore trailing prose', () => {
    const input = '{"foo": "bar"} This is not part of the JSON';
    expect(extractFirstJson(input)).toBe('{"foo": "bar"}');
  });

  it('should return null for empty input', () => {
    expect(extractFirstJson('')).toBeNull();
  });

  it('should return null for input without JSON', () => {
    expect(extractFirstJson('No JSON here')).toBeNull();
  });
});
