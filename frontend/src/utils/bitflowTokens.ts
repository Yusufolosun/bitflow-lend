export const formatBitflowTokenLabel = (name: string | undefined, tokenId: string): string => {
  const trimmedName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : '';

  if (trimmedName) {
    return trimmedName;
  }

  return tokenId
    .replace(/^token[-_]/i, '')
    .replace(/[-_]/g, ' ')
    .toUpperCase();
};
