import { describe, it, expect } from 'vitest';
import {
  formatNoApiKeyFoundMessage,
  formatNoModelSelectedMessage,
  formatNoModelsAvailableMessage,
  formatLoginInstructions,
} from './auth-guidance.js';

describe('Auth Guidance Messages', () => {
  describe('formatNoApiKeyFoundMessage', () => {
    it('includes provider name in message', () => {
      const msg = formatNoApiKeyFoundMessage('openai');
      expect(msg).toContain('openai');
      expect(msg).toContain('API key');
    });

    it('mentions pi login command', () => {
      const msg = formatNoApiKeyFoundMessage('anthropic');
      expect(msg).toContain('pi login anthropic');
    });

    it('mentions auth.json for manual setup', () => {
      const msg = formatNoApiKeyFoundMessage('custom-provider');
      expect(msg).toContain('auth.json');
    });

    it('includes documentation link', () => {
      const msg = formatNoApiKeyFoundMessage('any');
      expect(msg).toContain('https://pi.dev/docs/auth');
    });
  });

  describe('formatNoModelSelectedMessage', () => {
    it('indicates no model is selected', () => {
      const msg = formatNoModelSelectedMessage();
      expect(msg).toContain('No model selected');
    });

    it('suggests using --model flag', () => {
      const msg = formatNoModelSelectedMessage();
      expect(msg).toContain('--model');
      expect(msg).toContain('<provider>/<model>');
    });

    it('suggests setting default in config', () => {
      const msg = formatNoModelSelectedMessage();
      expect(msg).toContain('pi config set defaultProvider');
      expect(msg).toContain('pi config set defaultModel');
    });

    it('suggests listing models', () => {
      const msg = formatNoModelSelectedMessage();
      expect(msg).toContain('--list-models');
    });
  });

  describe('formatNoModelsAvailableMessage', () => {
    it('indicates no models available', () => {
      const msg = formatNoModelsAvailableMessage();
      expect(msg).toContain('No models available');
    });

    it('suggests logging in to add a model', () => {
      const msg = formatNoModelsAvailableMessage();
      expect(msg).toContain('pi login <provider>');
    });

    it('mentions models.json manual configuration', () => {
      const msg = formatNoModelsAvailableMessage();
      expect(msg).toContain('models.json');
    });
  });

  describe('formatLoginInstructions', () => {
    it('provides specific instructions for anthropic', () => {
      const msg = formatLoginInstructions('anthropic');
      expect(msg).toContain('ANTHROPIC_API_KEY');
      expect(msg).toContain('pi login anthropic');
    });

    it('provides specific instructions for openai', () => {
      const msg = formatLoginInstructions('openai');
      expect(msg).toContain('OPENAI_API_KEY');
    });

    it('falls back to generic for unknown provider', () => {
      const msg = formatLoginInstructions('unknown');
      expect(msg).toContain('unknown');
      expect(msg).toContain('auth.json');
    });
  });
});
