# Curex24 Mobile App

Expo React Native mobile app for the Curex24 platform.

## Getting Started

```bash
# Install dependencies (from repository root)
pnpm install

# Start the development server
pnpm start

# Run on specific platform
pnpm android
pnpm ios
pnpm web
```

## Testing

Tests use [Jest](https://jestjs.io/) via [jest-expo](https://docs.expo.dev/develop/unit-testing/) and [React Native Testing Library](https://callstack.github.io/react-native-testing-library/).

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Writing Tests

Place test files next to the component or module they test using a `__tests__` directory:

```
src/
  components/
    common/
      Button.tsx
      __tests__/
        Button.test.tsx
```

Test files should use the `.test.tsx` or `.test.ts` extension.

#### Example Test

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders the title text', () => {
    render(<Button title="Submit" onPress={() => {}} />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(screen.getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```
