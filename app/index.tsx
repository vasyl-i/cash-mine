import { BalanceList } from '@/components/organisms/balance-list';
import { ScreenContainer } from '@/components/templates/screen-container';

export default function HomeRoute() {
  return (
    <ScreenContainer>
      <BalanceList />
    </ScreenContainer>
  );
}
