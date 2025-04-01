import { Task } from '@/types/csv';
import { cleanDomain, cleanCompanyName, isGenericEmail } from '@/utils/domainUtils';
import { extractFullName, assignOtherDMNames } from '@/utils/contactUtils';

export const processSingleEmailCsv = async (
  data: Array<Record<string, any>>, 
  mappedColumns: Record<string, string>,
  taskId: string,
  updateTask: (id: string, updates: Partial<Task>) => void
): Promise<Array<Record<string, any>>> => {
  const emailColumn = mappedColumns.email;
  const fullNameColumn = mappedColumns.full_name || '';
  const websiteColumn = mappedColumns.website || '';
  const companyNameColumn = mappedColumns.company || '';
  
  if (!emailColumn) {
    throw new Error("Email column not mapped");
  }
  
  console.log("Starting processSingleEmailCsv with mappings:", mappedColumns);
  
  updateTask(taskId, { progress: 20 });
  
  // First pass: filter out rows with empty email and initialize fields
  let processedData = data.filter(row => {
    const email = row[emailColumn]?.toString().toLowerCase() || '';
    return email.trim() !== '';
  }).map(row => {
    const email = (row[emailColumn] || '').toString().toLowerCase().trim();
    const cleanedCompanyName = companyNameColumn ? cleanCompanyName(row[companyNameColumn] || '') : '';
    const websiteUrl = websiteColumn ? row[websiteColumn] || '' : '';
    const cleanedDomain = cleanDomain(websiteUrl);
    
    // Get full name using utility function
    const fullName = extractFullName(row, fullNameColumn);
    
    console.log(`Row email: ${email}, fullName detected: ${fullName}`);
    
    const emailDomain = email.split('@')[1] || '';
    const domainToUse = cleanedDomain || emailDomain;
    
    return {
      ...row,
      cleaned_company_name: cleanedCompanyName,
      cleaned_website: domainToUse,
      mx_provider: '',
      other_dm_name: '',
      to_be_deleted: 'No',
      domain_occurrence_count: 0,
      email_occurrence: 0,
      full_name: fullName
    };
  });
  
  console.log(`After initial filtering: ${processedData.length} rows remain`);
  updateTask(taskId, { progress: 30 });
  
  const emailIndices: Record<string, number> = {};
  const domainCounts: Record<string, Array<number>> = {};
  
  // Second pass: mark duplicates and count domain occurrences
  processedData.forEach((row, index) => {
    const email = row[emailColumn]?.toString().toLowerCase() || '';
    const domain = row.cleaned_website || '';
    
    if (email) {
      if (email in emailIndices) {
        row.to_be_deleted = 'Yes (Duplicate Email)';
      } else {
        emailIndices[email] = index;
      }
    }
    
    if (domain) {
      if (!domainCounts[domain]) {
        domainCounts[domain] = [];
      }
      domainCounts[domain].push(index);
    }
  });
  
  // Assign domain occurrence counts and mark rows for deletion if necessary
  Object.entries(domainCounts).forEach(([domain, indices]) => {
    indices.forEach((index, i) => {
      processedData[index].domain_occurrence_count = i + 1;
      
      if (i + 1 > 6 && processedData[index].to_be_deleted === 'No') {
        processedData[index].to_be_deleted = 'Yes (Domain Frequency > 6)';
      }
    });
  });
  
  // Clear the other_dm_name field for all rows before assignment
  processedData.forEach(row => {
    row.other_dm_name = '';
  });
  
  // Collect valid contacts for other_dm_name assignment
  const validContacts: Array<{index: number, fullName: string, email: string, domain: string}> = [];
  
  processedData.forEach((row, index) => {
    const email = row[emailColumn] || '';
    const fullName = row.full_name || '';
    const domain = row.cleaned_website || '';
    
    // Use email domain if website domain is not available
    const effectiveDomain = domain || email.split('@')[1] || '';
    
    console.log(`Row ${index} - Domain: ${effectiveDomain}, Full Name: ${fullName}, Email: ${email}, Delete: ${row.to_be_deleted}`);
    
    if (row.to_be_deleted === 'No' && 
        fullName && 
        email && 
        !isGenericEmail(email)) {
      
      validContacts.push({
        index,
        fullName,
        email,
        domain: effectiveDomain
      });
      
      console.log(`Added to validContacts with domain ${effectiveDomain}`);
    }
  });
  
  console.log(`Found ${validContacts.length} valid contacts for other_dm_name assignment`);
  
  // Assign other_dm_name using utility function
  const contactsWithOtherDM = assignOtherDMNames(validContacts);
  
  // Update the processed data with the assigned other_dm_names
  contactsWithOtherDM.forEach(contact => {
    if (contact.otherDmName) {
      processedData[contact.index].other_dm_name = contact.otherDmName;
    }
  });
  
  // Remove individual MX lookups - now handled in the context
  updateTask(taskId, { progress: 50 });
  
  // Only filter out rows marked for deletion due to duplicate emails
  // Keep rows with valid emails even if the domain is empty
  processedData = processedData.filter(row => {
    const email = row[emailColumn]?.toString().toLowerCase() || '';
    return (email.trim() !== '' && row.to_be_deleted !== 'Yes (Duplicate Email)');
  });
  
  console.log(`Final processed data has ${processedData.length} rows`);
  console.log(`Sample row other_dm_name value:`, processedData.length > 0 ? processedData[0].other_dm_name : 'No rows');
  
  return processedData;
};
