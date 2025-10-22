import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StoryForm from '../app/components/StoryForm';
import { TEST_API_BASE_URL } from '../testUtils/apiBase';

jest.mock('../app/components/Story', () => () => null);
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ locale: 'es' }),
}));

const API_BASE = TEST_API_BASE_URL;
process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE;

describe('StoryForm generate prompt', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url === `${API_BASE}/backgrounds`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ top: [], bottom: [] }),
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

  it('actualiza el textarea al generar un prompt', async () => {
    render(<StoryForm />);

    const generateButton = screen.getByRole('button', { name: 'generatePrompt' });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/prompt/generate`,
        expect.any(Object)
      );
      expect(screen.getByPlaceholderText('Escribe el inicio de la historia')).toHaveValue('Prompt generado');
    });
  });
});
