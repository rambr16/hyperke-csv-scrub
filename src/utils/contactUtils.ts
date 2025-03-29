
/**
 * Contact utilities for CSV processing
 */

/**
 * Assign other_dm_name using a round-robin approach
 * @param contacts List of contacts with names and emails
 * @returns The same list with other_dm_name assigned to each contact
 */
export const assignOtherDMNames = (
  contacts: Array<{index: number, fullName: string, email: string, domain: string}>
): Array<{index: number, fullName: string, email: string, domain: string, otherDmName: string}> => {
  // Group contacts by domain
  const contactsByDomain: Record<string, Array<{index: number, fullName: string, email: string, domain: string}>> = {};
  
  contacts.forEach(contact => {
    if (!contactsByDomain[contact.domain]) {
      contactsByDomain[contact.domain] = [];
    }
    contactsByDomain[contact.domain].push(contact);
  });
  
  console.log(`Grouped contacts by domain:`, Object.keys(contactsByDomain).map(domain => 
    `${domain}: ${contactsByDomain[domain].length} contacts`
  ));
  
  // Assign other_dm_name using round-robin approach within each domain group
  const result = contacts.map(contact => {
    const domainContacts = contactsByDomain[contact.domain] || [];
    let otherDmName = '';
    
    if (domainContacts.length > 1) {
      // Find the index of this contact in the domain group
      const contactIndex = domainContacts.findIndex(c => c.index === contact.index);
      
      // Get the next contact in the circular pattern
      const nextContact = domainContacts[(contactIndex + 1) % domainContacts.length];
      
      // Only assign if the contacts are different
      if (nextContact.email !== contact.email) {
        otherDmName = nextContact.fullName;
        console.log(`Assigned other_dm_name '${otherDmName}' to contact with email ${contact.email}`);
      }
    }
    
    return { ...contact, otherDmName };
  });
  
  return result;
};

/**
 * Extract a full name from various possible column names in the CSV
 */
export const extractFullName = (row: Record<string, any>, primaryField: string = ''): string => {
  if (primaryField && row[primaryField]) {
    return row[primaryField];
  }
  
  // Try common full name fields
  const nameFields = ['full_name', 'Full Name', 'name', 'Name', 'contact_name', 'person_name'];
  
  for (const field of nameFields) {
    if (row[field]) {
      return row[field];
    }
  }
  
  // Try to combine first and last name
  if (row['first_name'] && row['last_name']) {
    return `${row['first_name']} ${row['last_name']}`;
  }
  
  // Try variations of first and last name
  if (row['firstName'] && row['lastName']) {
    return `${row['firstName']} ${row['lastName']}`;
  }
  
  return '';
};

/**
 * Create a single consolidated contact object from multiple email fields
 */
export const consolidateMultipleEmails = (
  row: Record<string, any>
): Array<{email: string, fullName: string, title: string, phone: string}> => {
  const contacts: Array<{email: string, fullName: string, title: string, phone: string}> = [];
  
  // Process up to 3 email columns
  for (let i = 1; i <= 3; i++) {
    const emailField = `email_${i}`;
    const email = row[emailField]?.toString().toLowerCase().trim() || '';
    
    if (!email) continue;
    
    // Get full name from corresponding field or fallback
    const fullNameField = `email_${i}_full_name`;
    let fullName = row[fullNameField] || '';
    
    // For the first email, try additional fallbacks
    if (i === 1 && !fullName) {
      fullName = extractFullName(row);
    }
    
    // Get title and phone if available
    const titleField = `email_${i}_title`;
    const title = row[titleField] || row['title'] || '';
    
    const phoneField = `email_${i}_phone`;
    const phone = row[phoneField] || row['phone'] || '';
    
    contacts.push({
      email,
      fullName,
      title,
      phone
    });
  }
  
  return contacts;
};
