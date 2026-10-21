import { useLocalSearchParams } from 'expo-router';

import { ClaimStatusCard } from '@/components/organisms/claim-status-card';
import { ScreenContainer } from '@/components/templates/screen-container';

export default function ClaimStatusRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScreenContainer>
      <ClaimStatusCard id={id} />
    </ScreenContainer>
  );
}
