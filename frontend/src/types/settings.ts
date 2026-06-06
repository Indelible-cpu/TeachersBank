export interface Settings {
  systemName: string;
  organizationName: string;
  receiptFooter: string;
  defaultLanguage: string;
  logo: string | null;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  interestPercentage: number;
  emergencyInterestPercentage?: number;
  maturityMonths: number;
  loanDurationRules?: Array<{ id: string; minAmount: number; maxAmount: number; durationMonths: number; }>;
  emergencyLoanDurationRules?: Array<{ id: string; minAmount: number; maxAmount: number; durationMonths: number; }>;
  showProfileInHeader: boolean;
  currency: string;
  baseShareAmount: number;
  baseEmergencyAmount: number;
}
