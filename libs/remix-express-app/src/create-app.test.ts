import { describe, expect, it } from 'vitest';
import { createApp } from './create-app';

describe('create-app', () => {
  it('returns the input function', () => {
    const inputFn = () => {};
    expect(createApp(inputFn)).toEqual(inputFn);
  });
});
