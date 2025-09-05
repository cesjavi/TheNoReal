import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../app/components/Story', () => () => null);
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ locale: 'es' }),
}));

import StoryForm from '../app/components/StoryForm';

describe('StoryForm prompt actions', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url === '/api/backgrounds') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ top: [], bottom: [] }),
        });
      }
      if (url === '/api/prompt/improve') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ prompt: 'Prompt mejorado' }),
        });
      }
      if (url === '/api/prompt/generate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ prompt: 'Prompt generado' }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('mejora y genera prompts desde la API', async () => {
    render(<StoryForm />);

    const textarea = screen.getByPlaceholderText('Escribe el inicio de la historia');

    fireEvent.change(textarea, { target: { value: 'Inicio' } });

    fireEvent.click(screen.getByRole('button', { name: 'improvePrompt' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/prompt/improve', expect.any(Object));
      expect(textarea).toHaveValue('Prompt mejorado');
    });

    fireEvent.click(screen.getByRole('button', { name: 'generatePrompt' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/prompt/generate', expect.any(Object));
      expect(textarea).toHaveValue('Prompt generado');
    });
  });
});
