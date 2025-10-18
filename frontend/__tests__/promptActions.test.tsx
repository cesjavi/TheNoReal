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

const API_BASE = 'http://localhost:4000/api';
process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE;

import StoryForm from '../app/components/StoryForm';

describe('StoryForm prompt actions', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url === `${API_BASE}/backgrounds`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ top: [], bottom: [] }),
        });
      }
      if (url === `${API_BASE}/prompt/improve`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ prompt: 'Prompt mejorado' }),
        });
      }
      if (url === `${API_BASE}/prompt/generate`) {
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
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/prompt/improve`,
        expect.any(Object)
      );
      expect(textarea).toHaveValue('Prompt mejorado');
    });

    fireEvent.click(screen.getByRole('button', { name: 'generatePrompt' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/prompt/generate`,
        expect.any(Object)
      );
      expect(textarea).toHaveValue('Prompt generado');
    });
  });
});
