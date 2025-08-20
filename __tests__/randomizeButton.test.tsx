import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('../app/components/Story', () => () => null);
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../app/providers/LanguageProvider', () => ({
  useLanguage: () => ({ locale: 'es' }),
}));
import StoryForm from '../app/components/StoryForm';

describe('StoryForm randomizer', () => {
  test('muestra botón Randomizar', () => {
    render(<StoryForm />);
    expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument();
  });

  test('al pulsar Randomizar se genera una configuración', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    render(<StoryForm />);
    fireEvent.click(screen.getByRole('button', { name: /randomize/i }));
    expect(screen.getAllByText('Aventura', { selector: 'span' })[0]).toBeInTheDocument();
    expect(screen.getByText('ligero')).toBeInTheDocument();
    expect(screen.getByText('infantil')).toBeInTheDocument();
    spy.mockRestore();
  });
});

