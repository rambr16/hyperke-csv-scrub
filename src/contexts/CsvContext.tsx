import React, { createContext, useState, useContext } from 'react';
import Papa from 'papaparse';
import { useToast } from "@/components/ui/use-toast";
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

  const processMultipleEmailCsv = async (
    data: Array<Record<string, any>>, 
    mappedColumns: Record<string, string>,
    taskId: string
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
