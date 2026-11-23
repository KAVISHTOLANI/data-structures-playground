import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Node Garden', () => {
  it('pushes and pops a stack, reporting underflow', async () => {
    window.location.hash = '/stack';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Value'), '99');
    await user.click(screen.getByRole('button', { name: 'Push' }));
    expect(screen.getByTestId('message')).toHaveTextContent('Pushed 99 onto the top');
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Pop' }));
    await user.click(screen.getByRole('button', { name: 'Pop' }));
    expect(screen.getByTestId('message')).toHaveTextContent('underflow');
    expect(screen.getByRole('list', { name: 'Operation log' })).toHaveTextContent('pop()');
  });

  it('validates input', async () => {
    window.location.hash = '/queue';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Enqueue' }));
    expect(screen.getByText('Enter a whole number from −999 to 999.')).toBeInTheDocument();
  });

  it('finds and removes in a linked list', async () => {
    window.location.hash = '/list';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Value'), '23');
    await user.click(screen.getByRole('button', { name: 'Find' }));
    expect(screen.getByTestId('message')).toHaveTextContent('Found 23 at position 2 after 3 steps');
    await user.type(screen.getByLabelText('Value'), '23');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByLabelText(/Linked list:/)).toHaveAccessibleName('Linked list: 8 → 15 → 42');
  });

  it('deletes a two-child node from the BST and plays a traversal', async () => {
    window.location.hash = '/bst';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Key'), '30');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByTestId('message')).toHaveTextContent('successor 35');
    await user.click(screen.getByRole('button', { name: 'Play traversal' }));
    expect(screen.getByTestId('traversal')).toHaveTextContent('20 → 35 → 40 → 50 → 60 → 65 → 70 → 80');
  });

  it('extracts the minimum from the heap', async () => {
    window.location.hash = '/heap';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Extract min' }));
    expect(screen.getByTestId('message')).toHaveTextContent('Removed the minimum 2');
    await user.type(screen.getByLabelText('Value'), '1');
    await user.click(screen.getByRole('button', { name: 'Insert' }));
    expect(screen.getByTestId('message')).toHaveTextContent(/sifted it up \d level/);
  });
});
