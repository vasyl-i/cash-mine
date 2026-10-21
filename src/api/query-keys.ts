export const queryKeys = {
  balances: ['balances'] as const,
  claimOptions: (asset: string) => ['claim-options', asset] as const,
  claim: (id: string) => ['claim', id] as const,
  activity: ['activity'] as const,
};
