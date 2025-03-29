import { Task } from '@/types/csv';
import { 
  cleanDomain, 
  cleanCompanyName, 
  isGenericEmail,
  getMxProvider 
} from '@/utils/domainUtils';
import {
  assignOtherDMNames,
  extractFullName,
  consolidateMultipleEmails
} from '@/utils/contactUtils';
import { COLUMNS_TO_REMOVE } from '@/utils/csvConstants';

export const processDomainOnlyCsv = async (
  data: Array<Record<string, any>>, 
  mappedColumns: Record<string, string>,
  taskId: string,
  updateTask: (id: string, updates: Partial<Task>) => void
): Promise<Array<Record<string, any>>> => {
  const websiteColumn = mappedColumns.website;
  if (!websiteColumn) {
    throw new Error("Website column not mapped");
  }
  
  const total = data.length;
  let processed = 0;
  
  const processedData = data.filter(row => {
    const websiteUrl = row[websiteColumn] || '';
    return websiteUrl.trim() !== '';
  }).map(row => {
    const websiteUrl = row[websiteColumn] || '';
    const cleanedDomain = cleanDomain(websiteUrl);
    
    processed++;
    if (processed % 10 === 0 || processed === total) {
      const progress = Math.min(10 + Math.floor((processed / total) * 80), 90);
      updateTask(taskId, { progress });
    }
    
    return {
      ...row,
      cleaned_website: cleanedDomain,
      to_be_deleted: 'No'
    };
  });
  
  return processedData;
};

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
  
  // Try to get MX provider info
  const total = processedData.length;
  let mxProcessed = 0;
  
  updateTask(taskId, { progress: 70 });
  
  for (let i = 0; i < processedData.length; i++) {
    const row = processedData[i];
    if (row.cleaned_website) {
      try {
        row.mx_provider = await getMxProvider(row.cleaned_website);
      } catch (error) {
        console.error(`Failed to get MX provider for ${row.cleaned_website}:`, error);
        row.mx_provider = 'other';
      }
    }
    
    mxProcessed++;
    if (mxProcessed % 10 === 0 || mxProcessed === total) {
      const progress = Math.min(70 + Math.floor((mxProcessed / total) * 20), 90);
      updateTask(taskId, { progress });
    }
  }
  
  // Only filter out rows marked for deletion due to duplicate emails
  // Keep rows with valid emails even if the domain is empty
  processedData = processedData.filter(row => {
    const email = row[emailColumn]?.toString().toLowerCase() || '';
    return (email.trim() !== '' && row.to_be_deleted !== 'Yes (Duplicate Email)');
  });
  
  console.log(`Final processed data has ${processedData.length} rows`);
  console.log(`Sample row other_dm_name value:`, processedData.length > 0 ? processedData[0].other_dm_name : 'No rows');
  
  // Log a few example rows to verify other_dm_name is set
  for (let i = 0; i < Math.min(5, processedData.length); i++) {
    console.log(`Row ${i} other_dm_name: ${processedData[i].other_dm_name}`);
  }
  
  return processedData;
};

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
      return {
        ...row,
        email: contact.email,
        full_name: contact.fullName,
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
  
  // Try to get MX provider info
  const total = processedData.length;
  let mxProcessed = 0;
  
  updateTask(taskId, { progress: 70 });
  
  for (let i = 0; i < processedData.length; i++) {
    const row = processedData[i];
    if (row.cleaned_website) {
      try {
        row.mx_provider = await getMxProvider(row.cleaned_website);
      } catch (error) {
        console.error(`Failed to get MX provider for ${row.cleaned_website}:`, error);
        row.mx_provider = 'other';
      }
    }
    
    mxProcessed++;
    if (mxProcessed % 10 === 0 || mxProcessed === total) {
      const progress = Math.min(70 + Math.floor((mxProcessed / total) * 20), 90);
      updateTask(taskId, { progress });
    }
  }
  
  // Only filter out rows marked for deletion due to duplicate emails
  const finalData = processedData.filter(row => {
    const email = row.email?.toString().toLowerCase() || '';
    return (email.trim() !== '' && row.to_be_deleted !== 'Yes (Duplicate Email)');
  });
  
  console.log(`Final processed data has ${finalData.length} rows`);
  
  // Log a few example rows to verify other_dm_name is set
  for (let i = 0; i < Math.min(5, finalData.length); i++) {
    console.log(`Row ${i} other_dm_name: ${finalData[i].other_dm_name}`);
  }
  
  return finalData;
};

export const finalizeProcessedData = (
  processedData: Array<Record<string, any>>
): Array<Record<string, any>> => {
  // Remove unwanted columns and filter out rows marked for deletion
  return processedData
    .map(row => {
      const newRow = { ...row };
      COLUMNS_TO_REMOVE.forEach(column => {
        delete newRow[column];
      });
      return newRow;
    })
    .filter(row => 
      row.to_be_deleted !== 'Yes (Domain Frequency > 6)' && 
      row.to_be_deleted !== 'Yes (Duplicate Email)' &&
      row.to_be_deleted !== 'Yes (All Emails Duplicate)'
    );
};
