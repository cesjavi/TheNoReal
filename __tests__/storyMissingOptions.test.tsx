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

describe('Story options regeneration', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ text: 'Nuevo capítulo\n---\n1. Explorar la cueva' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('loggea error si la API devuelve menos opciones de las esperadas', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(screen.getByText('Explorar la cueva')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      'La API devolvió menos opciones de las esperadas'
    );

    consoleSpy.mockRestore();
  });
});
