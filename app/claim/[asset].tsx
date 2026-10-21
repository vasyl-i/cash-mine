import { useLocalSearchParams } from 'expo-router';

import { ClaimForm } from '@/components/organisms/claim-form';
import { ScreenContainer } from '@/components/templates/screen-container';

export default function ClaimRoute() {
  const { asset } = useLocalSearchParams<{ asset: string }>();
  return (
    <ScreenContainer>
      <ClaimForm asset={asset} />
    </ScreenContainer>
  );
}
