
import { Task } from '@/types/csv';
import { cleanDomain, cleanCompanyName, isGenericEmail } from '@/utils/domainUtils';
import { consolidateMultipleEmails, assignOtherDMNames } from '@/utils/contactUtils';

export const processMultipleEmailCsv = async (
  data: Array<Record<string, any>>, 
  mappedColumns: Record<string, string>,
  taskId: string,
  updateTask: (id: string, updates: Partial<Task>) => void
): Promise<Array<Record<string, any>>> => {
  const companyNameColumn = mappedColumns.company || '';
  const websiteColumn = mappedColumns.website || '';
  
  console.log("Starting processMultipleEmailCsv with mappings:", mappedColumns);
  updateTask(taskId, { progress: 15 });
  
  // First pass: merge multiple email columns into a single row and normalize fields
  const processedData = data.flatMap(row => {
    // Collect all contacts from the row
    const contacts = consolidateMultipleEmails(row);
    
    // Skip row if no valid emails
    if (contacts.length === 0) return [];
    
    // Get company and website information
    const cleanedCompanyName = companyNameColumn ? cleanCompanyName(row[companyNameColumn] || '') : '';
    const websiteUrl = websiteColumn ? row[websiteColumn] || '' : '';
    let cleanedDomain = cleanDomain(websiteUrl);
    
    // Use first email domain as fallback if no website
    if (!cleanedDomain && contacts.length > 0) {
      const emailDomain = contacts[0].email.split('@')[1] || '';
      cleanedDomain = emailDomain;
    }
    
    // Create a new row for each contact
    return contacts.map(contact => {
      // Log the first_name and last_name values being added
      if (contact.firstName || contact.lastName) {
        console.log(`Creating row with email=${contact.email}, firstName=${contact.firstName}, lastName=${contact.lastName}`);
      }
      
      return {
        ...row,
        email: contact.email,
        full_name: contact.fullName,
        first_name: contact.firstName,
        last_name: contact.lastName,
        title: contact.title,
        phone: contact.phone,
        cleaned_company_name: cleanedCompanyName,
        cleaned_website: cleanedDomain,
        mx_provider: '',
        other_dm_name: '',
        to_be_deleted: 'No',
        domain_occurrence_count: 0,
        email_occurrence: 0
      };
    });
  });
  
  console.log(`After processing multiple emails: ${processedData.length} rows created`);
  updateTask(taskId, { progress: 30 });
  
  // Deduplicate emails
  const uniqueEmails = new Set<string>();
  const emailIndices: Record<string, number> = {};
  const domainCounts: Record<string, Array<number>> = {};
  
  // Mark duplicates and count domain occurrences
  processedData.forEach((row, index) => {
    const email = row.email?.toString().toLowerCase() || '';
    const domain = row.cleaned_website || '';
    
    if (email) {
      if (uniqueEmails.has(email)) {
        row.to_be_deleted = 'Yes (Duplicate Email)';
      } else {
        uniqueEmails.add(email);
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
    const email = row.email || '';
    const fullName = row.full_name || '';
    const domain = row.cleaned_website || '';
    
    // Use email domain if website domain is not available
    const effectiveDomain = domain || email.split('@')[1] || '';
    
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
  const finalData = processedData.filter(row => {
    const email = row.email?.toString().toLowerCase() || '';
    return (email.trim() !== '' && row.to_be_deleted !== 'Yes (Duplicate Email)');
  });
  
  console.log(`Final processed data has ${finalData.length} rows`);
  
  // Log a sample row to check for email-specific name fields
  if (finalData.length > 0) {
    const sampleRow = finalData[0];
    const nameFields = Object.keys(sampleRow).filter(key => 
      key.includes('name') || key.startsWith('email_')
    );
    
    console.log('Sample row name fields:', nameFields);
    nameFields.forEach(field => {
      console.log(`${field} = ${sampleRow[field]}`);
    });
  }
  
  return finalData;
};
