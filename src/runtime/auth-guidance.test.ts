import { describe, it, expect } from 'vitest';
import {
  formatNoApiKeyFoundMessage,
  formatNoModelSelectedMessage,
  formatNoModelsAvailableMessage,
  formatLoginInstructions,
} from './auth-guidance.js';

describe('Auth Guidance Messages', () => {
  describe('formatNoApiKeyFoundMessage', () => {
    it('should include provider name', () => {
      const msg = formatNoApiKeyFoundMessage('openai');
      expect(msg).toContain('No API key found for openai');
      expect(msg).toContain('pi login openai');
      expect(msg).toContain('~/.pi/agent/auth.json');
    });
  });

  describe('formatNoModelSelectedMessage', () => {
    it('should provide instructions to select a model', () => {
      const msg = formatNoModelSelectedMessage();
      expect(msg).toContain('No model selected');
      expect(msg).toContain('pi --model');
      expect(msg).toContain('pi config set defaultProvider');
      expect(msg).toContain('pi --list-models');
    });
  });

  describe('formatNoModelsAvailableMessage', () => {
    it('should explain why no models are available', () => {
      const msg = formatNoModelsAvailableMessage();
      expect(msg).toContain('No models available');
      expect(msg).toContain('pi login');
      expect(msg).toContain('models.json');
      expect(msg).toContain('pi --list-models');
    });
  });

  describe('formatLoginInstructions', () => {
    it('should return provider-specific instructions', () => {
      const msg = formatLoginInstructions('anthropic');
      expect(msg).toContain('ANTHROPIC_API_KEY');
      expect(msg).toContain('pi login anthropic');
    });
    it('should handle unknown provider', () => {
      const msg = formatLoginInstructions('unknown');
      expect(msg).toContain('Set API key for unknown');
    });
  });
});
