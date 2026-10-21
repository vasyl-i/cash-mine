import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/templates/screen-container';

describe('ScreenContainer', () => {
  it('renders children', async () => {
    await render(
      <SafeAreaProvider>
        <ScreenContainer>
          <Text>hello</Text>
        </ScreenContainer>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('hello')).toBeOnTheScreen();
  });
});
