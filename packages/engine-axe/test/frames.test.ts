import { describe, expect, it, vi } from 'vitest';
import { allowFrameOrigins, SAME_ORIGIN } from '../src/index.js';

describe('allowFrameOrigins', () => {
  it('configures axe allowedOrigins', () => {
    const configure = vi.fn();
    allowFrameOrigins([SAME_ORIGIN, 'https://widget.example'], { configure });
    expect(configure).toHaveBeenCalledWith({
      allowedOrigins: ['<same_origin>', 'https://widget.example'],
    });
  });

  it('requires at least one origin', () => {
    expect(() => {
      allowFrameOrigins([], { configure: vi.fn() });
    }).toThrow('at least one origin');
  });
});
