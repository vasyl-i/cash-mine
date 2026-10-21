import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ClaimForm } from '@/components/organisms/claim-form';
import { ScreenContainer } from '@/components/templates/screen-container';
import { useClaimsReady } from '@/store/claims-store';

export default function ClaimRoute() {
  const { asset } = useLocalSearchParams<{ asset: string }>();
  // Wait for the persisted attempt so a restored Idempotency-Key is never replaced by a new one.
  const ready = useClaimsReady();
  return (
    <ScreenContainer>
      {ready ? <ClaimForm asset={asset} /> : <ActivityIndicator style={{ flex: 1 }} />}
    </ScreenContainer>
  );
}
