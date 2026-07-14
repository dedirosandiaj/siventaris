export const globalCache: {
  counts: Record<string, number> | null;
  lastFetchTime: number;
} = {
  counts: null,
  lastFetchTime: 0
};
