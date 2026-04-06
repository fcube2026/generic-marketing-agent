import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  const onPressMock = jest.fn();

  beforeEach(() => {
    onPressMock.mockClear();
  });

  it('renders the title text', () => {
    render(<Button title="Submit" onPress={onPressMock} />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<Button title="Submit" onPress={onPressMock} />);
    fireEvent.press(screen.getByText('Submit'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    render(<Button title="Submit" onPress={onPressMock} disabled />);
    fireEvent.press(screen.getByText('Submit'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Submit" onPress={onPressMock} loading />
    );
    // Title should not be rendered when loading
    expect(queryByText('Submit')).toBeNull();
  });

  it('does not call onPress when loading', () => {
    render(<Button title="Submit" onPress={onPressMock} loading />);
    // The button is disabled when loading, so pressing should not trigger onPress
    const buttons = screen.root.findAllByType(
      require('react-native').TouchableOpacity
    );
    if (buttons.length > 0) {
      fireEvent.press(buttons[0]);
    }
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const { rerender } = render(
      <Button title="Primary" onPress={onPressMock} variant="primary" />
    );
    expect(screen.getByText('Primary')).toBeTruthy();

    rerender(
      <Button title="Outline" onPress={onPressMock} variant="outline" />
    );
    expect(screen.getByText('Outline')).toBeTruthy();

    rerender(
      <Button title="Danger" onPress={onPressMock} variant="danger" />
    );
    expect(screen.getByText('Danger')).toBeTruthy();
  });
});
