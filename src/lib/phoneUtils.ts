export interface CountryCode {
  code: string;
  name: string;
  prefix: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'GB', name: 'United Kingdom', prefix: '+44' },
  { code: 'US', name: 'United States', prefix: '+1' },
  { code: 'CA', name: 'Canada', prefix: '+1' },
  { code: 'AU', name: 'Australia', prefix: '+61' },
  { code: 'DE', name: 'Germany', prefix: '+49' },
  { code: 'FR', name: 'France', prefix: '+33' },
  { code: 'ES', name: 'Spain', prefix: '+34' },
  { code: 'IT', name: 'Italy', prefix: '+39' },
  { code: 'NL', name: 'Netherlands', prefix: '+31' },
  { code: 'BE', name: 'Belgium', prefix: '+32' },
  { code: 'CH', name: 'Switzerland', prefix: '+41' },
  { code: 'AT', name: 'Austria', prefix: '+43' },
  { code: 'SE', name: 'Sweden', prefix: '+46' },
  { code: 'NO', name: 'Norway', prefix: '+47' },
  { code: 'DK', name: 'Denmark', prefix: '+45' },
  { code: 'FI', name: 'Finland', prefix: '+358' },
  { code: 'IE', name: 'Ireland', prefix: '+353' },
  { code: 'PT', name: 'Portugal', prefix: '+351' },
  { code: 'GR', name: 'Greece', prefix: '+30' },
  { code: 'PL', name: 'Poland', prefix: '+48' },
  { code: 'CZ', name: 'Czech Republic', prefix: '+420' },
  { code: 'HU', name: 'Hungary', prefix: '+36' },
  { code: 'SK', name: 'Slovakia', prefix: '+421' },
  { code: 'SI', name: 'Slovenia', prefix: '+386' },
  { code: 'HR', name: 'Croatia', prefix: '+385' },
  { code: 'BG', name: 'Bulgaria', prefix: '+359' },
  { code: 'RO', name: 'Romania', prefix: '+40' },
  { code: 'LT', name: 'Lithuania', prefix: '+370' },
  { code: 'LV', name: 'Latvia', prefix: '+371' },
  { code: 'EE', name: 'Estonia', prefix: '+372' },
  { code: 'MT', name: 'Malta', prefix: '+356' },
  { code: 'CY', name: 'Cyprus', prefix: '+357' },
  { code: 'LU', name: 'Luxembourg', prefix: '+352' },
];

export function normalizePhoneNumber(phoneNumber: string, countryPrefix: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (!cleaned) return '';
  
  // If already has country code (starts with country code digits)
  const prefixDigits = countryPrefix.replace('+', '');
  if (cleaned.startsWith(prefixDigits)) {
    return '+' + cleaned;
  }
  
  // Remove leading zeros for most countries (except some special cases)
  const withoutLeadingZeros = cleaned.replace(/^0+/, '');
  
  // Add country prefix
  return countryPrefix + withoutLeadingZeros;
}

export function validateE164PhoneNumber(phoneNumber: string): boolean {
  // E.164 format: + followed by up to 15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

export function formatPhoneNumberDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  if (phoneNumber.startsWith('+44')) {
    // UK format
    const number = phoneNumber.substring(3);
    if (number.length === 10) {
      return `+44 ${number.substring(0, 2)} ${number.substring(2, 6)} ${number.substring(6)}`;
    }
  } else if (phoneNumber.startsWith('+1')) {
    // US/Canada format
    const number = phoneNumber.substring(2);
    if (number.length === 10) {
      return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
  }
  
  // Default format: just add spaces every 3-4 digits
  return phoneNumber.replace(/(\+\d{1,3})(\d{3,4})(\d{3,4})(\d+)/, '$1 $2 $3 $4');
}