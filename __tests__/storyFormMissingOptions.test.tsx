import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockStory = jest.fn(() => null);
jest.mock('../app/components/Story', () => (props: any) => {
  mockStory(props);
  return null;
});
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ locale: 'es' }),
}));
import StoryForm from '../app/components/StoryForm';

describe('StoryForm fetches missing options', () => {
  beforeEach(() => {
    mockStory.mockClear();
    const initialText =
      'Capítulo inicial\n---\n1. Explorar el antiguo castillo en la colina oscura\n2. Investigar las ruinas perdidas del templo antiguo secreto';
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: initialText }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            options: [
              'Investigar las ruinas perdidas del templo antiguo secreto',
              'Descubrir los misterios ocultos bajo la ciudad olvidada',
            ],
          }),
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('completa opciones faltantes desde /api/options', async () => {
    render(<StoryForm />);

    fireEvent.change(
      screen.getByLabelText(/Opciones por decisión/),
      { target: { value: '3' } }
    );

    fireEvent.change(
      screen.getByPlaceholderText('Escribe el inicio de la historia'),
      { target: { value: 'Inicio de prueba' } }
    );

    fireEvent.click(screen.getByRole('button', { name: 'createStory' }));

    await waitFor(() => expect(mockStory).toHaveBeenCalled());

    const props = mockStory.mock.calls[0][0];
    expect(props.initialOptions).toEqual([
      'Explorar el antiguo castillo en la colina oscura',
      'Investigar las ruinas perdidas del templo antiguo secreto',
    ]);
  });
});

