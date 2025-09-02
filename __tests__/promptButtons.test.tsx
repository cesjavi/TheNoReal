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

describe('StoryForm prompt buttons', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url === '/api/backgrounds') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ top: [], bottom: [] }),
        });
      }
      if (url === '/api/prompt/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Primer prompt' }),
        });
      }
      if (url === '/api/prompt/2') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Segundo prompt' }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('muestra botones y actualiza el textarea con cada endpoint', async () => {
    render(<StoryForm />);

    const prompt1 = screen.getByRole('button', { name: 'Prompt 1' });
    const prompt2 = screen.getByRole('button', { name: 'Prompt 2' });

    expect(prompt1).toBeInTheDocument();
    expect(prompt2).toBeInTheDocument();

    fireEvent.click(prompt1);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/prompt/1');
      expect(screen.getByPlaceholderText('Escribe el inicio de la historia')).toHaveValue('Primer prompt');
    });

    fireEvent.click(prompt2);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/prompt/2');
      expect(screen.getByPlaceholderText('Escribe el inicio de la historia')).toHaveValue('Segundo prompt');
    });
  });
});
