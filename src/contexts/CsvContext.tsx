import React, { createContext, useState, useContext } from 'react';
import Papa from 'papaparse';
import { useToast } from "@/components/ui/use-toast";

// Columns to remove in output CSV
const COLUMNS_TO_REMOVE = [
  'reviews_link', 'reviews_tags', 'reviews_per_score', 'reviews_per_score_1', 
  'reviews_per_score_2', 'reviews_per_score_3', 'reviews_per_score_4', 
  'reviews_per_score_5', 'photos_count', 'photo', 'street_view', 'located_in', 
  'working_hours', 'working_hours_old_format', 'other_hours', 'popular_times', 
  'business_status', 'about', 'range', 'posts', 'logo', 'description', 
  'typical_time_spent', 'verified', 'owner_id', 'owner_title', 'owner_link', 
  'reservation_links', 'booking_appointment_link', 'menu_link', 'order_links', 
  'location_link', 'location_reviews_link', 'place_id', 'google_id', 'cid', 
  'kgmid', 'reviews_id', 'located_google_id', 'website_title', 'website_generator', 
  'website_description', 'website_keywords', 'website_has_fb_pixel', 'website_has_google_tag',
  'tiktok', 'medium', 'reddit', 'skype', 'snapchat', 'telegram', 'whatsapp', 'twitter',
  'vimeo', 'youtube', 'github', 'crunchbase', 'instagram', 'facebook', 'latitude', 
  'longitude', 'h3', 'plus_code', 'area_service', 'Seniority', 'Function', 'Key', 
  'ID', 'Company ID', 'Headline', 'Company Twitter', 'Company Facebook', 'Alexa Ranking', 
  'Keywords', 'Industries', 'Secondary Industries', 'Company Postal Code', 'Company Founded Year'
];

export type CsvType = 'domain_only' | 'single_email' | 'multiple_email' | 'unknown';

interface Task {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Array<Record<string, any>>;
  mappedColumns?: Record<string, string>;
  csvType?: CsvType;
  originalHeaders?: string[];
  error?: string;
}

interface CsvContextType {
  tasks: Task[];
  addTask: (file: File) => Promise<string>;
  getTask: (id: string) => Task | undefined;
  updateTask: (id: string, updates: Partial<Task>) => void;
  resetTasks: () => void;
  detectCsvType: (headers: string[]) => CsvType;
  processCsv: (taskId: string, mappedColumns: Record<string, string>) => Promise<void>;
  downloadResult: (taskId: string) => void;
}

const CsvContext = createContext<CsvContextType>({
  tasks: [],
  addTask: async () => '',
  getTask: () => undefined,
  updateTask: () => {},
  resetTasks: () => {},
  detectCsvType: () => 'unknown',
  processCsv: async () => {},
  downloadResult: () => {}
});

export const useCsv = () => useContext(CsvContext);

export const CsvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  const addTask = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields && results.meta.fields.length > 0) {
            const taskId = Date.now().toString();
            const newTask: Task = {
              id: taskId,
              filename: file.name,
              status: 'pending',
              progress: 0,
              originalHeaders: results.meta.fields,
              csvType: detectCsvType(results.meta.fields)
            };
            
            setTasks(prev => [...prev, newTask]);
            resolve(taskId);
          } else {
            toast({
              variant: "destructive",
              title: "Invalid CSV",
              description: "The uploaded file is not a valid CSV or is empty."
            });
            reject(new Error("Invalid CSV file"));
          }
        },
        error: (error) => {
          toast({
            variant: "destructive",
            title: "Error parsing CSV",
            description: error.message
          });
          reject(error);
        }
      });
    });
  };

  const getTask = (id: string) => {
    return tasks.find(task => task.id === id);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, ...updates } : task
      )
    );
  };

  const resetTasks = () => {
    setTasks([]);
    toast({
      title: "Reset successful",
      description: "All tasks have been cleared"
    });
  };

  const detectCsvType = (headers: string[]): CsvType => {
    const hasWebsite = headers.some(h => 
      h.toLowerCase().includes('website') || 
      h.toLowerCase().includes('domain') || 
      h.toLowerCase().includes('url')
    );
    
    const emailColumns = headers.filter(h => 
      h.toLowerCase().includes('email')
    );
    
    if (emailColumns.length === 0 && hasWebsite) {
      return 'domain_only';
    }
    
    const hasMultipleEmails = emailColumns.some(h => 
      h.includes('email_1') || h.includes('email_2') || h.includes('email_3')
    );
    
    if (hasMultipleEmails) {
      return 'multiple_email';
    }
    
    if (emailColumns.length > 0) {
      return 'single_email';
    }
    
    return 'unknown';
  };

  const cleanDomain = (url: string): string => {
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

  const cleanCompanyName = (name: string): string => {
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

  const isGenericEmail = (email: string): boolean => {
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

  const getMxProvider = async (domain: string): Promise<string> => {
    try {
      console.log(`Checking MX for domain: ${domain}`);
      return 'other'; // Default fallback to prevent errors
      
      // When you have a reliable API, you can replace the above with:
      /*
      const response = await fetch(`https://your-reliable-dns-api.com/mx/${domain}`);
      const data = await response.json();
      
      if (!data.records) return 'other';
      
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

  const processCsv = async (taskId: string, mappedColumns: Record<string, string>) => {
    const task = getTask(taskId);
    if (!task) return;
    
    updateTask(taskId, { 
      status: 'processing', 
      progress: 5,
      mappedColumns 
    });
    
    try {
      const fileInput = document.getElementById(taskId) as HTMLInputElement;
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        throw new Error("File not found");
      }
      
      const file = fileInput.files[0];
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data } = results as { data: Array<Record<string, any>> };
          
          if (!data || data.length === 0) {
            updateTask(taskId, { 
              status: 'error', 
              error: 'No data found in CSV file' 
            });
            return;
          }
          
          updateTask(taskId, { progress: 10 });
          
          let processedData: Array<Record<string, any>> = [];
          
          switch (task.csvType) {
            case 'domain_only':
              processedData = await processDomainOnlyCsv(data, mappedColumns, taskId);
              break;
              
            case 'single_email':
              processedData = await processSingleEmailCsv(data, mappedColumns, taskId);
              break;
              
            case 'multiple_email':
              processedData = await processMultipleEmailCsv(data, mappedColumns, taskId);
              break;
              
            default:
              throw new Error("Unknown CSV type");
          }
          
          processedData = processedData.map(row => {
            const newRow = { ...row };
            COLUMNS_TO_REMOVE.forEach(column => {
              delete newRow[column];
            });
            return newRow;
          });
          
          processedData = processedData.filter(row => 
            row.to_be_deleted !== 'Yes (Domain Frequency > 6)' && 
            row.to_be_deleted !== 'Yes (Duplicate Email)' &&
            row.to_be_deleted !== 'Yes (All Emails Duplicate)'
          );
          
          updateTask(taskId, { 
            status: 'completed', 
            progress: 100,
            result: processedData
          });
          
          toast({
            title: "Processing complete",
            description: `Successfully processed ${processedData.length} rows`
          });
        },
        error: (error) => {
          updateTask(taskId, { 
            status: 'error', 
            error: error.message 
          });
          
          toast({
            variant: "destructive",
            title: "Processing error",
            description: error.message
          });
        }
      });
    } catch (error: any) {
      updateTask(taskId, { 
        status: 'error', 
        error: error.message 
      });
      
      toast({
        variant: "destructive",
        title: "Processing error",
        description: error.message
      });
    }
  };

  const processDomainOnlyCsv = async (
    data: Array<Record<string, any>>, 
    mappedColumns: Record<string, string>,
    taskId: string
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

  const processSingleEmailCsv = async (
    data: Array<Record<string, any>>, 
    mappedColumns: Record<string, string>,
    taskId: string
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
      
      // Try to get full name from multiple possible columns
      let fullName = '';
      if (fullNameColumn && row[fullNameColumn]) {
        fullName = row[fullNameColumn];
      } else if (row['Full Name']) {
        fullName = row['Full Name'];
      } else if (row['email_1_full_name']) {
        fullName = row['email_1_full_name'];
      } else if (row['full_name']) {
        fullName = row['full_name'];
      }
      
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
    
    // Group valid rows by domain for other_dm_name assignment
    const validDomainRows: Record<string, Array<{index: number, fullName: string, email: string}>> = {};
    
    processedData.forEach((row, index) => {
      const domain = row.cleaned_website || '';
      const fullName = row.full_name || '';
      const email = row[emailColumn] || '';
      
      console.log(`Row ${index} - Domain: ${domain}, Full Name: ${fullName}, Email: ${email}, Delete: ${row.to_be_deleted}`);
      
      // We include rows even if domain is empty, as long as they have a valid email and full name
      if (row.to_be_deleted === 'No' && 
          fullName && 
          email && 
          !isGenericEmail(email)) {
        
        // Group by domain (if available) or by email domain if no website domain
        const groupKey = domain || email.split('@')[1] || 'unknown';
        
        if (!validDomainRows[groupKey]) {
          validDomainRows[groupKey] = [];
        }
        validDomainRows[groupKey].push({index, fullName, email});
        
        console.log(`Added to validDomainRows under key ${groupKey}`);
      }
    });
    
    console.log("Valid domain rows for other_dm_name assignment:", validDomainRows);
    
    // Assign other_dm_name using round-robin pattern for each domain group
    Object.entries(validDomainRows).forEach(([domain, rows]) => {
      if (rows.length > 1) {
        rows.forEach((row, i) => {
          // Get the next row in a circular pattern
          const nextRow = rows[(i + 1) % rows.length];
          processedData[row.index].other_dm_name = nextRow.fullName;
          
          console.log(`Assigned other_dm_name '${nextRow.fullName}' to row with email ${row.email}`);
        });
      }
    });
    
    // Get MX provider info - skip for now due to API issues
    const total = processedData.length;
    updateTask(taskId, { progress: 90 });
    
    // Only filter out rows marked for deletion due to duplicate emails
    // Keep rows with valid emails even if the domain is empty
    processedData = processedData.filter(row => {
      const email = row[emailColumn]?.toString().toLowerCase() || '';
      return (email.trim() !== '' && row.to_be_deleted !== 'Yes (Duplicate Email)');
    });
    
    console.log(`Final processed data has ${processedData.length} rows`);
    console.log(`Sample row other_dm_name value:`, processedData.length > 0 ? processedData[0].other_dm_name : 'No rows');
    
    // Let's log a few example rows to verify other_dm_name is set
    for (let i = 0; i < Math.min(5, processedData.length); i++) {
      console.log(`Row ${i} other_dm_name: ${processedData[i].other_dm_name}`);
    }
    
    return processedData;
  };

  const processMultipleEmailCsv = async (
    data: Array<Record<string, any>>, 
    mappedColumns: Record<string, string>,
    taskId: string
  ): Promise<Array<Record<string, any>>> => {
    const companyNameColumn = mappedColumns.company || '';
    const websiteColumn = mappedColumns.website || '';
    
    console.log("Starting processMultipleEmailCsv with mappings:", mappedColumns);
    updateTask(taskId, { progress: 15 });
    
    // First pass: initialize fields and filter rows with all empty emails
    let processedData = data.filter(row => {
      const email1 = row['email_1']?.toString().toLowerCase() || '';
      const email2 = row['email_2']?.toString().toLowerCase() || '';
      const email3 = row['email_3']?.toString().toLowerCase() || '';
      return email1.trim() !== '' || email2.trim() !== '' || email3.trim() !== '';
    }).map(row => {
      const email1 = (row['email_1'] || '').toString().toLowerCase().trim();
      const email2 = (row['email_2'] || '').toString().toLowerCase().trim();
      const email3 = (row['email_3'] || '').toString().toLowerCase().trim();
      
      let fullName1 = '';
      if (row['email_1_full_name']) {
        fullName1 = row['email_1_full_name'];
      } else if (row['Full Name']) {
        fullName1 = row['Full Name'];
      } else if (row['full_name']) {
        fullName1 = row['full_name'];
      }
      
      const fullName2 = row['email_2_full_name'] || '';
      const fullName3 = row['email_3_full_name'] || '';
      
      console.log(`Multiple email row - Names: [${fullName1}, ${fullName2}, ${fullName3}], Emails: [${email1}, ${email2}, ${email3}]`);
      
      const cleanedCompanyName = companyNameColumn ? cleanCompanyName(row[companyNameColumn] || '') : '';
      const websiteUrl = websiteColumn ? row[websiteColumn] || '' : '';
      let cleanedDomain = cleanDomain(websiteUrl);
      
      if (!cleanedDomain && email1) {
        const emailDomain = email1.split('@')[1] || '';
        cleanedDomain = emailDomain;
      } else if (!cleanedDomain && email2) {
        const emailDomain = email2.split('@')[1] || '';
        cleanedDomain = emailDomain;
      } else if (!cleanedDomain && email3) {
        const emailDomain = email3.split('@')[1] || '';
        cleanedDomain = emailDomain;
      }
      
      return {
        ...row,
        cleaned_company_name: cleanedCompanyName,
        cleaned_website: cleanedDomain,
        mx_provider_1: '',
        mx_provider_2: '',
        mx_provider_3: '',
        other_dm_name: '',
        to_be_deleted: 'No',
        domain_occurrence_count: 0,
        email_1_full_name: fullName1,
        email_2_full_name: fullName2,
        email_3_full_name: fullName3
      };
    });
    
    console.log(`After initial filtering: ${processedData.length} rows remain`);
    updateTask(taskId, { progress: 30 });
    
    const allEmails = new Set<string>();
    const domainCounts: Record<string, Array<number>> = {};
    
    // Second pass: check for duplicate emails and count domain occurrences
    processedData.forEach((row, index) => {
      const email1 = row['email_1'] || '';
      const email2 = row['email_2'] || '';
      const email3 = row['email_3'] || '';
      
      let hasUniqueEmail = false;
      
      if (email1 && !allEmails.has(email1)) {
        allEmails.add(email1);
        hasUniqueEmail = true;
      }
      
      if (email2 && !allEmails.has(email2)) {
        allEmails.add(email2);
        hasUniqueEmail = true;
      }
      
      if (email3 && !allEmails.has(email3)) {
        allEmails.add(email3);
        hasUniqueEmail = true;
      }
      
      if (!hasUniqueEmail) {
        if (!email1 && !email2 && !email3) {
          processedData[index].to_be_deleted = 'Yes (No Emails)';
        } else {
          processedData[index].to_be_deleted = 'Yes (All Emails Duplicate)';
        }
      }
      
      const domain = row.cleaned_website || '';
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
    
    // Collect valid contacts for other_dm_name assignment by domain
    const validContactsByDomain: Record<string, Array<{rowIndex: number, fullName: string, email: string}>> = {};
    
    processedData.forEach((row, index) => {
      const domain = row.cleaned_website || '';
      
      // Group by domain or by a fallback key if domain is not available
      const groupKey = domain || 'unknown';
      
      if (row.to_be_deleted !== 'No') {
        return;
      }
      
      // Check each email field
      for (let i = 1; i <= 3; i++) {
        const emailField = `email_${i}`;
        const email = row[emailField] || '';
        const fullNameField = `email_${i}_full_name`;
        let fullName = row[fullNameField] || '';
        
        // Fallback to Full Name field if email_1_full_name is empty
        if (i === 1 && !fullName) {
          fullName = row['Full Name'] || row['full_name'] || '';
        }
        
        if (email && fullName && !isGenericEmail(email)) {
          if (!validContactsByDomain[groupKey]) {
            validContactsByDomain[groupKey] = [];
          }
          validContactsByDomain[groupKey].push({rowIndex: index, fullName, email});
          
          console.log(`Found valid contact: ${email} with name ${fullName} for domain ${groupKey}`);
        }
      }
    });
    
    console.log("Valid contacts by domain for other_dm_name assignment:", validContactsByDomain);
    
    // Assign other_dm_name using round-robin pattern for each domain
    Object.entries(validContactsByDomain).forEach(([domain, contacts]) => {
      if (contacts.length > 1) {
        contacts.forEach((contact, i) => {
          // Get the next contact in a circular pattern
          const nextContact = contacts[(i + 1) % contacts.length];
          
          // Make sure we're not assigning a contact to themselves
          if (nextContact.email !== contact.email) {
            processedData[contact.rowIndex].other_dm_name = nextContact.fullName;
            console.log(`Assigned other_dm_name '${nextContact.fullName}' to row with email ${contact.email}`);
          }
        });
      }
    });
    
    // Skip MX provider checks for now due to API issues
    updateTask(taskId, { progress: 90 });
    
    // Keep rows with unique emails even if they don't have a domain
    // Only filter out rows with no emails or where all emails are duplicates
    processedData = processedData.filter(row => {
      const email1 = row['email_1']?.toString().toLowerCase() || '';
      const email2 = row['email_2']?.toString().toLowerCase() || '';
      const email3 = row['email_3']?.toString().toLowerCase() || '';
      
      // If at least one email exists, keep the row unless marked for deletion
      const hasAtLeastOneEmail = email1.trim() !== '' || email2.trim() !== '' || email3.trim() !== '';
      
      return hasAtLeastOneEmail && 
             row.to_be_deleted !== 'Yes (All Emails Duplicate)' &&
             row.to_be_deleted !== 'Yes (No Emails)';
    });
    
    console.log(`Final processed data has ${processedData.length} rows`);
    console.log(`Sample row other_dm_name value:`, processedData.length > 0 ? processedData[0].other_dm_name : 'No rows');
    
    // Let's log a few example rows to verify other_dm_name is set
    for (let i = 0; i < Math.min(5, processedData.length); i++) {
      console.log(`Row ${i} other_dm_name: ${processedData[i].other_dm_name}`);
    }
    
    return processedData;
  };

  const downloadResult = (taskId: string) => {
    const task = getTask(taskId);
    if (!task || !task.result) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "No processed data found for this task"
      });
      return;
    }
    
    const csv = Papa.unparse(task.result);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cleaned_${task.filename.replace('.csv', '')}_${timestamp}.csv`;
    
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `File: ${filename}`
    });
  };

  return (
    <CsvContext.Provider value={{
      tasks,
      addTask,
      getTask,
      updateTask,
      resetTasks,
      detectCsvType,
      processCsv,
      downloadResult
    }}>
      {children}
    </CsvContext.Provider>
  );
};
