
/**
 * Domain and MX utilities for CSV processing
 */

/**
 * Clean a URL to extract just the domain
 */
export const cleanDomain = (url: string): string => {
  if (!url) return '';
  
  try {
    let domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
    
    const domainMatch = domain.match(/^([^\/\?#]+)/);
    if (domainMatch && domainMatch[1]) {
      return domainMatch[1].trim();
    }
    
    return domain.trim();
  } catch (error) {
    console.error("Error cleaning domain:", error);
    return url.trim();
  }
};

/**
 * Clean a company name by removing common suffixes and formatting
 */
export const cleanCompanyName = (name: string): string => {
  if (!name) return '';
  
  try {
    let cleaned = name.toLowerCase();
    
    cleaned = cleaned
      .replace(/ ltd/g, "")
      .replace(/ llc/g, "")
      .replace(/ gmbh/g, "")
      .replace(/ pvt/g, "")
      .replace(/ private/g, "")
      .replace(/ limited/g, "")
      .replace(/ inc/g, "")
      .replace(/®/g, "")
      .replace(/™/g, "")
      .replace(/,/g, "")
      .replace(/ technologies/g, "");
    
    cleaned = cleaned.replace(/\.[a-z]+/g, "").replace(/\.$/, "");
    
    cleaned = cleaned.replace(/[^ -~]/g, "");
    
    cleaned = cleaned.replace(/\b\w/g, c => c.toUpperCase());
    
    cleaned = cleaned.replace(/'S/g, "'s");
    
    cleaned = cleaned.replace(/\s*[\|:]\s*.*/, "");
    
    return cleaned.trim();
  } catch (error) {
    console.error("Error cleaning company name:", error);
    return name.trim();
  }
};

/**
 * Check if an email is generic (info@, contact@, etc.)
 */
export const isGenericEmail = (email: string): boolean => {
  if (!email) return false;
  
  const genericPrefixes = [
    'info', 'contact', 'hello', 'support', 'admin', 'sales', 
    'marketing', 'help', 'service', 'billing', 'office', 'mail',
    'team', 'enquiries', 'enquiry', 'general', 'hr', 'careers',
    'feedback', 'webmaster', 'helpdesk', 'customerservice', 'noreply',
    'no-reply', 'donotreply', 'do-not-reply'
  ];
  
  const emailPrefix = email.split('@')[0].toLowerCase();
  return genericPrefixes.includes(emailPrefix);
};

/**
 * Extract domain from email address
 */
export const getDomainFromEmail = (email: string): string => {
  if (!email || typeof email !== "string" || !email.includes('@')) {
    return '';
  }
  
  return email.split('@')[1];
};

/**
 * Get MX provider by querying Google's DNS API
 */
export const getMxProviderFromDNS = async (domain: string): Promise<string> => {
  if (!domain) {
    console.log('Empty domain provided to getMxProviderFromDNS');
    return 'Unknown';
  }
  
  try {
    console.log(`Fetching MX records for domain: ${domain}`);
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    
    if (!response.ok) {
      console.error(`DNS lookup failed with status: ${response.status}`);
      return 'Error';
    }
    
    const data = await response.json();
    
    if (!data.Answer || data.Answer.length === 0) {
      console.log(`No MX records found for ${domain}`);
      return 'No MX records';
    }
    
    const mxRecords = data.Answer.map((record: { data: string }) => record.data.toLowerCase());
    console.log(`MX records for ${domain}:`, mxRecords);
    
    // Check for Google MX records
    if (mxRecords.some((mx: string) => mx.includes('google') || mx.includes('gmail'))) {
      return 'Google';
    }
    
    // Check for Microsoft MX records
    if (mxRecords.some((mx: string) => 
      mx.includes('outlook') || 
      mx.includes('microsoft') || 
      mx.includes('hotmail') ||
      mx.includes('office365')
    )) {
      return 'Microsoft';
    }
    
    // Check for other common providers
    if (mxRecords.some((mx: string) => mx.includes('yahoo'))) {
      return 'Yahoo';
    }
    
    if (mxRecords.some((mx: string) => mx.includes('zoho'))) {
      return 'Zoho';
    }
    
    if (mxRecords.some((mx: string) => mx.includes('protonmail'))) {
      return 'ProtonMail';
    }
    
    return 'Other';
  } catch (error) {
    console.error(`Error fetching MX records for ${domain}:`, error);
    return 'Error';
  }
};

/**
 * Process MX lookups in batches to avoid rate limiting
 */
export const batchProcessMxLookups = async (
  domains: string[], 
  batchSize: number = 10,
  onProgress?: (processed: number, total: number) => void
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  const uniqueDomains = [...new Set(domains.filter(d => d))];
  
  console.log(`Processing ${uniqueDomains.length} unique domains for MX lookup`);
  
  // Create batches of domains
  const batches: string[][] = [];
  for (let i = 0; i < uniqueDomains.length; i += batchSize) {
    batches.push(uniqueDomains.slice(i, i + batchSize));
  }
  
  console.log(`Created ${batches.length} batches of MX lookups`);
  
  let processedCount = 0;
  
  // Process each batch
  for (const batch of batches) {
    const batchPromises = batch.map(domain => 
      getMxProviderFromDNS(domain)
        .then(provider => {
          results[domain] = provider;
          return { domain, provider };
        })
    );
    
    // Wait for all promises in the batch to resolve
    await Promise.all(batchPromises);
    
    processedCount += batch.length;
    if (onProgress) {
      onProgress(processedCount, uniqueDomains.length);
    }
    
    // Small delay to avoid overwhelming the DNS API
    if (batches.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
};

/**
 * Get MX provider for an email or domain
 */
export const getMxProvider = async (emailOrDomain: string): Promise<string> => {
  if (!emailOrDomain) return 'Unknown';
  
  let domain = emailOrDomain;
  
  // Extract domain if an email is provided
  if (emailOrDomain.includes('@')) {
    domain = getDomainFromEmail(emailOrDomain);
  }
  
  if (!domain) return 'Unknown';
  
  try {
    return await getMxProviderFromDNS(domain);
  } catch (error) {
    console.error(`Error in getMxProvider for ${domain}:`, error);
    return 'Error';
  }
};
