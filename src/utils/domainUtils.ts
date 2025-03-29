
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
 * Get the MX provider for a domain
 * Currently a placeholder that will be replaced with actual API call later
 */
export const getMxProvider = async (domain: string): Promise<string> => {
  try {
    console.log(`Looking up MX provider for domain: ${domain}`);
    
    // This is a placeholder for a real MX lookup API call
    // In production, this would make an API call to a DNS or email validation service
    
    // Simulate different MX providers based on domain name patterns for testing
    if (domain.includes('gmail') || domain.includes('google')) {
      return 'google';
    } else if (domain.includes('outlook') || domain.includes('microsoft') || domain.includes('live')) {
      return 'microsoft';
    } else if (domain.includes('yahoo')) {
      return 'yahoo';
    } else if (domain.includes('apple') || domain.includes('icloud')) {
      return 'apple';
    }
    
    return 'other';
    
    /* 
    // Example of what a real implementation might look like:
    const response = await fetch(`https://your-mx-lookup-api.com/lookup?domain=${domain}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`MX lookup failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      return 'other';
    }
    
    const mxRecords = data.records.map((record) => record.value.toLowerCase());
    
    if (mxRecords.some((mx) => mx.includes('google') || mx.includes('gmail'))) {
      return 'google';
    }
    
    if (mxRecords.some((mx) => mx.includes('outlook') || mx.includes('microsoft'))) {
      return 'microsoft';
    }
    
    return 'other';
    */
  } catch (error) {
    console.error("Error fetching MX records:", error);
    return 'other';
  }
};
