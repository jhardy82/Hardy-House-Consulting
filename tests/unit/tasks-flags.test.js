import { parseFlags, VALUE_FLAGS } from '../../tasks/flags.js';

describe('parseFlags', () => {
  test('trailing value-flag with no value returns boolean true', () => {
    expect(parseFlags(['--section'])).toEqual({ section: true });
  });

  test('trailing value-flag at end of longer args returns boolean true', () => {
    expect(parseFlags(['task-title', '--note'])).toEqual({ note: true });
  });

  test('adjacent flags: value-flag followed by another flag does not eat the second flag', () => {
    expect(parseFlags(['--priority', '--section', 'auth'])).toEqual({
      priority: true,
      section: 'auth',
    });
  });

  test('consumes value when next token is not a flag', () => {
    expect(parseFlags(['--priority', '2', '--section', 'api'])).toEqual({
      priority: '2',
      section: 'api',
    });
  });

  test('note with multi-word value is a single string', () => {
    expect(parseFlags(['--note', 'my note text'])).toEqual({ note: 'my note text' });
  });

  test('unknown flag is stored as boolean true without consuming next token', () => {
    const result = parseFlags(['--verbose', 'something']);
    expect(result.verbose).toBe(true);
  });

  test('VALUE_FLAGS contains exactly the five expected keys', () => {
    expect([...VALUE_FLAGS].sort()).toEqual(['desc', 'note', 'priority', 'section', 'status']);
  });
});
