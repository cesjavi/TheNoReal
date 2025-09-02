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

describe('StoryForm improve prompt', () => {
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
      expect(global.fetch).toHaveBeenCalledWith('/api/prompt/improve', expect.any(Object));
      expect(textarea).toHaveValue('Texto mejorado');
      expect(screen.getByText('2/500 tokens')).toBeInTheDocument();
    });
  });

  it('no hace nada si el textarea está vacío', () => {
    render(<StoryForm />);

    fireEvent.click(screen.getByRole('button', { name: 'improvePrompt' }));

    expect(global.fetch).toHaveBeenCalledTimes(1); // solo /api/backgrounds
    expect(global.fetch).not.toHaveBeenCalledWith('/api/prompt/improve', expect.anything());
  });
});
