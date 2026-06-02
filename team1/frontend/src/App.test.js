import { render, screen } from '@testing-library/react';
import App from './App';

test('renders MEDviz app', () => {
  render(<App />);
  const element = screen.getByText(/MEDviz/i);
  expect(element).toBeInTheDocument();
});
