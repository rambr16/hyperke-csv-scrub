
import { CsvType } from '@/types/csv';

export const detectCsvType = (headers: string[]): CsvType => {
  const hasWebsite = headers.some(h => 
    h.toLowerCase().includes('website') || 
    h.toLowerCase().includes('domain') || 
    h.toLowerCase().includes('url')
  );
  
  const emailColumns = headers.filter(h => 
    h.toLowerCase().includes('email')
  );
  
  // Check for email_1, email_2, etc. pattern
  const hasMultipleEmails = headers.some(h => 
    h.match(/email_[1-9]/) || h.match(/email[1-9]/)
  );
  
  if (emailColumns.length === 0 && hasWebsite) {
    return 'domain_only';
  }
  
  if (hasMultipleEmails) {
    return 'multiple_email';
  }
  
  if (emailColumns.length > 0) {
    return 'single_email';
  }
  
  return 'unknown';
};
