
/**
 * Utilities for fetching and caching MX record information
 */

// In-memory cache for MX providers to avoid repeated lookups
const mxProviderCache: Record<string, string> = {};

/**
 * Fetch MX records for multiple domains in a single request
 * This reduces the number of network calls by combining multiple domains
 */
export const batchFetchMxRecords = async (
  domains: string[], 
  batchSize: number = 30 // Increased batch size
): Promise<Record<string, string>> => {
  if (!domains || domains.length === 0) return {};
  
  // Filter out duplicates and empty domains
  const uniqueDomains = [...new Set(domains.filter(Boolean))];
  console.log(`Preparing to fetch MX records for ${uniqueDomains.length} unique domains`);
  
  // Check cache first and only request uncached domains
  const uncachedDomains: string[] = [];
  const results: Record<string, string> = {};
  
  uniqueDomains.forEach(domain => {
    if (domain in mxProviderCache) {
      results[domain] = mxProviderCache[domain];
    } else {
      uncachedDomains.push(domain);
    }
  });
  
  if (uncachedDomains.length === 0) {
    console.log('All domains found in cache, no network requests needed');
    return results;
  }
  
  console.log(`Making network requests for ${uncachedDomains.length} uncached domains`);
  
  // Process domains in larger batches
  const batches: string[][] = [];
  for (let i = 0; i < uncachedDomains.length; i += batchSize) {
    batches.push(uncachedDomains.slice(i, i + batchSize));
  }
  
  // Process each batch with Promise.all for parallel execution
  for (const batch of batches) {
    try {
      // Process all domains in the batch concurrently
      const batchPromises = batch.map(async (domain) => {
        try {
          const provider = await fetchMxProvider(domain);
          results[domain] = provider;
          mxProviderCache[domain] = provider; // Cache the result
          return { domain, provider };
        } catch (error) {
          console.error(`Error fetching MX for ${domain}:`, error);
          results[domain] = 'Error';
          mxProviderCache[domain] = 'Error'; // Cache errors too
          return { domain, provider: 'Error' };
        }
      });
      
      // Wait for all promises in this batch
      await Promise.all(batchPromises);
      
      // Add a small delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }
  
  return results;
};

/**
 * Fetch MX provider for a single domain
 */
export const fetchMxProvider = async (domain: string): Promise<string> => {
  if (!domain) return 'Unknown';
  
  // Check cache first
  if (domain in mxProviderCache) {
    return mxProviderCache[domain];
  }
  
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    
    if (!response.ok) {
      console.error(`DNS lookup failed with status: ${response.status}`);
      return 'Error';
    }
    
    const data = await response.json();
    
    if (!data.Answer || data.Answer.length === 0) {
      return 'No MX records';
    }
    
    const mxRecords = data.Answer.map((record: { data: string }) => record.data.toLowerCase());
    
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
