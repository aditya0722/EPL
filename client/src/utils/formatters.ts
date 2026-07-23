export const cleanPurpose = (purpose?: string): string => {
  if (!purpose) return 'Personal Loan';
  if (purpose.includes('@') || purpose.includes('Interest') || purpose.includes('Processing Fee')) {
    const mainPart = purpose.split(/[@:(]/)[0].trim();
    if (mainPart) return mainPart;
  }
  return purpose;
};
