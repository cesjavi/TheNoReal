import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Story from '../app/components/Story';

describe('Story', () => {
  const initialStory = 'Inicio de la historia';
  const initialOptions = ['Opción 1', 'Opción 2'];
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: async () => ({ text: 'Opción 1\nNueva opción 1\nNueva opción 2' }),
    });
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-ignore
      delete global.fetch;
    }
    jest.resetAllMocks();
  });

  test('permite seleccionar una opción y volver al estado inicial', async () => {
    render(
      <Story
        initialStory={initialStory}
        initialOptions={initialOptions}
        optionsPerDecision={2}
        endingMode="sin_final_definido"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: initialOptions[0] }));

    expect(await screen.findByText(/Opción 1/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByText(initialStory)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: initialOptions[0] })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: initialOptions[1] })).toBeInTheDocument();
  });
});
