import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Story from '../app/components/Story';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ locale: 'es' }),
}));
jest.mock('@/lib/imageGenerator', () => ({
  generateImage: jest.fn().mockResolvedValue({ url: null, truncated: false }),
}));

describe('Story options regeneration', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            story: 'Nuevo capítulo',
            options: ['Explorar el misterioso bosque oscuro con gran cautela'],
            isFinal: false,
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            options: ['Investigar las antiguas ruinas de la ciudad perdida'],
          }),
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('reintenta completar opciones faltantes', async () => {
    render(
      <Story
        initialStory="Inicio"
        initialOptions={['Uno', 'Dos']}
        optionsPerDecision={2}
        endingMode="infinita"
        genres={[]}
        estilo={{}}
        ajustes={{}}
        onBack={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Uno'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/story');
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe('/api/options');
    expect(
      await screen.findByText(
        'Explorar el misterioso bosque oscuro con gran cautela'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Investigar las antiguas ruinas de la ciudad perdida')
    ).toBeInTheDocument();
  });
});
