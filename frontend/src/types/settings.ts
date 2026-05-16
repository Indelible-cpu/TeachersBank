export interface Settings {
  systemName: string;
  organizationName: string;
  receiptFooter: string;
  defaultLanguage: string;
  logo: string | null;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  interestPercentage: number;
  maturityMonths: number;
}
