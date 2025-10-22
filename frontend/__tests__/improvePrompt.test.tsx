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

describe('StoryForm improve prompt', () => {
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
          json: () => Promise.resolve({ prompt: 'Texto mejorado' }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('llama al endpoint y actualiza el textarea', async () => {
    render(<StoryForm />);

    const textarea = screen.getByPlaceholderText('Escribe el inicio de la historia');
    fireEvent.change(textarea, { target: { value: 'texto' } });

    fireEvent.click(screen.getByRole('button', { name: 'improvePrompt' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/prompt/improve`,
        expect.any(Object)
      );
      expect(textarea).toHaveValue('Texto mejorado');
      expect(screen.getByText('2/500 tokens')).toBeInTheDocument();
    });
  });

  it('no hace nada si el textarea está vacío', () => {
    render(<StoryForm />);

    fireEvent.click(screen.getByRole('button', { name: 'improvePrompt' }));

    expect(global.fetch).toHaveBeenCalledTimes(1); // solo /backgrounds
    expect(global.fetch).not.toHaveBeenCalledWith(
      `${API_BASE}/prompt/improve`,
      expect.anything()
    );
  });
});
