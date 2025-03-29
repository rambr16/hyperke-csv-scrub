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
          // Check if the CSV has headers and data
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
    // Check for domain-only case (has website/domain column but no email)
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
    
    // Check for the multiple email case (email_1, email_2, email_3)
    const hasMultipleEmails = emailColumns.some(h => 
      h.includes('email_1') || h.includes('email_2') || h.includes('email_3')
    );
    
    if (hasMultipleEmails) {
      return 'multiple_email';
    }
    
    // Check for single email case
    if (emailColumns.length > 0) {
      return 'single_email';
    }
    
    return 'unknown';
  };

  const cleanDomain = (url: string): string => {
    if (!url) return '';
    
    try {
      // Remove protocol and www.
      let domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
      
      // Extract domain.com
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
      // This is a simplified version of the complex formula in the requirements
      let cleaned = name.toLowerCase();
      
      // Remove common business suffixes
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
      
      // Remove URLs and file extensions
      cleaned = cleaned.replace(/\.[a-z]+/g, "").replace(/\.$/, "");
      
      // Remove non-printable characters
      cleaned = cleaned.replace(/[^ -~]/g, "");
      
      // Proper case
      cleaned = cleaned.replace(/\b\w/g, c => c.toUpperCase());
      
      // Fix possessives
      cleaned = cleaned.replace(/'S/g, "'s");
      
      // Remove anything after | or :
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
      'marketing', 'help', 'service', 'billing', 'office', 'mail'
    ];
    
    const emailPrefix = email.split('@')[0].toLowerCase();
    return genericPrefixes.includes(emailPrefix);
  };

  const getMxProvider = async (domain: string): Promise<string> => {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
      const data = await response.json();
      
      if (!data.Answer) return 'other';
      
      const mxRecords = data.Answer.map((answer: any) => answer.data.toLowerCase());
      
      if (mxRecords.some((mx: string) => mx.includes('google') || mx.includes('gmail'))) {
        return 'google';
      }
      
      if (mxRecords.some((mx: string) => mx.includes('outlook') || mx.includes('microsoft'))) {
        return 'microsoft';
      }
      
      return 'other';
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
      // Parse the CSV file again to get the data
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
          
          // Process based on CSV type
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
          
          // Remove columns that should be excluded
          processedData = processedData.map(row => {
            const newRow = { ...row };
            COLUMNS_TO_REMOVE.forEach(column => {
              delete newRow[column];
            });
            return newRow;
          });
          
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
    // Get the website column
    const websiteColumn = mappedColumns.website;
    if (!websiteColumn) {
      throw new Error("Website column not mapped");
    }
    
    const total = data.length;
    let processed = 0;
    
    // Process each row
    const processedData = data.map(row => {
      const websiteUrl = row[websiteColumn] || '';
      const cleanedDomain = cleanDomain(websiteUrl);
      
      processed++;
      if (processed % 10 === 0 || processed === total) {
        const progress = Math.min(10 + Math.floor((processed / total) * 80), 90);
        updateTask(taskId, { progress });
      }
      
      return {
        ...row,
        cleaned_website: cleanedDomain
      };
    });
    
    return processedData;
  };

  const processSingleEmailCsv = async (
    data: Array<Record<string, any>>, 
    mappedColumns: Record<string, string>,
    taskId: string
  ): Promise<Array<Record<string, any>>> => {
    // Get the mapped columns
    const emailColumn = mappedColumns.email;
    const websiteColumn = mappedColumns.website || '';
    const companyNameColumn = mappedColumns.company || '';
    
    if (!emailColumn) {
      throw new Error("Email column not mapped");
    }
    
    updateTask(taskId, { progress: 20 });
    
    // Step 1: Remove duplicates based on email
    const uniqueEmails = new Set<string>();
    let uniqueData = data.filter(row => {
      const email = row[emailColumn]?.toLowerCase() || '';
      if (!email || uniqueEmails.has(email)) return false;
      uniqueEmails.add(email);
      return true;
    });
    
    updateTask(taskId, { progress: 30 });
    
    // Step 2: Clean company names and website domains
    uniqueData = uniqueData.map(row => {
      const cleanedCompanyName = companyNameColumn ? cleanCompanyName(row[companyNameColumn] || '') : '';
      const websiteUrl = websiteColumn ? row[websiteColumn] || '' : '';
      const cleanedDomain = cleanDomain(websiteUrl);
      
      // Extract domain from email if website is not provided
      const email = row[emailColumn] || '';
      const emailDomain = email.split('@')[1] || '';
      const domainToUse = cleanedDomain || emailDomain;
      
      return {
        ...row,
        cleaned_company_name: cleanedCompanyName,
        cleaned_website: domainToUse
      };
    });
    
    updateTask(taskId, { progress: 50 });
    
    // Step 3: Count domain occurrences and filter if > 6
    const domainCounts: Record<string, number> = {};
    uniqueData.forEach(row => {
      const domain = row.cleaned_website || '';
      if (domain) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });
    
    uniqueData = uniqueData.filter(row => {
      const domain = row.cleaned_website || '';
      return !domain || domainCounts[domain] <= 6;
    });
    
    updateTask(taskId, { progress: 60 });
    
    // Step 4: Assign other_dm_name for repeated domains using round robin
    const domainGroups: Record<string, Array<{ email: string, fullName: string, row: Record<string, any> }>> = {};
    
    // Group rows by domain
    uniqueData.forEach(row => {
      const domain = row.cleaned_website || '';
      const email = row[emailColumn] || '';
      const fullName = row['full_name'] || row['name'] || '';
      
      if (domain && email && !isGenericEmail(email)) {
        if (!domainGroups[domain]) {
          domainGroups[domain] = [];
        }
        
        domainGroups[domain].push({ email, fullName, row });
      }
    });
    
    // Assign other_dm_name using round robin for each domain group with more than 1 entry
    Object.keys(domainGroups).forEach(domain => {
      const group = domainGroups[domain];
      
      if (group.length > 1) {
        group.forEach((item, index) => {
          // Pick the next person in the group as the alternate (round robin)
          const nextIndex = (index + 1) % group.length;
          const alternateContact = group[nextIndex];
          
          if (alternateContact.fullName) {
            item.row.other_dm_name = alternateContact.fullName;
          }
        });
      }
    });
    
    updateTask(taskId, { progress: 70 });
    
    // Step 5: Process MX records (10 at a time)
    const batchSize = 10;
    for (let i = 0; i < uniqueData.length; i += batchSize) {
      const batch = uniqueData.slice(i, i + batchSize);
      const promises = batch.map(async (row) => {
        const email = row[emailColumn] || '';
        const domain = email.split('@')[1] || '';
        
        if (domain) {
          row.mx_provider = await getMxProvider(domain);
        }
        
        return row;
      });
      
      await Promise.all(promises);
      
      const progress = Math.min(70 + Math.floor(((i + batch.length) / uniqueData.length) * 20), 90);
      updateTask(taskId, { progress });
    }
    
    return uniqueData;
  };

  const processMultipleEmailCsv = async (
    data: Array<Record<string, any>>, 
    mappedColumns: Record<string, string>,
    taskId: string
  ): Promise<Array<Record<string, any>>> => {
    // Get the mapped columns - note that we might have multiple email columns
    const companyNameColumn = mappedColumns.company || '';
    const websiteColumn = mappedColumns.website || '';
    
    updateTask(taskId, { progress: 15 });
    
    // Step 1: Organize email data and remove duplicates
    const allEmails = new Set<string>();
    let processedData = data.filter(row => {
      // Check for email_1, email_2, email_3
      const email1 = row['email_1'] || '';
      const email2 = row['email_2'] || '';
      const email3 = row['email_3'] || '';
      
      // Keep row if at least one email is unique
      let keepRow = false;
      
      if (email1 && !allEmails.has(email1)) {
        allEmails.add(email1);
        keepRow = true;
      }
      
      if (email2 && !allEmails.has(email2)) {
        allEmails.add(email2);
        keepRow = true;
      }
      
      if (email3 && !allEmails.has(email3)) {
        allEmails.add(email3);
        keepRow = true;
      }
      
      return keepRow;
    });
    
    updateTask(taskId, { progress: 30 });
    
    // Step 2: Clean company names and website domains
    processedData = processedData.map(row => {
      const cleanedCompanyName = companyNameColumn ? cleanCompanyName(row[companyNameColumn] || '') : '';
      const websiteUrl = websiteColumn ? row[websiteColumn] || '' : '';
      let cleanedDomain = cleanDomain(websiteUrl);
      
      // If no website, try to extract domain from email
      if (!cleanedDomain) {
        const email1 = row['email_1'] || '';
        if (email1) {
          const emailDomain = email1.split('@')[1] || '';
          cleanedDomain = emailDomain;
        }
      }
      
      return {
        ...row,
        cleaned_company_name: cleanedCompanyName,
        cleaned_website: cleanedDomain
      };
    });
    
    updateTask(taskId, { progress: 45 });
    
    // Step 3: Count domain occurrences and filter if > 5
    const domainCounts: Record<string, number> = {};
    processedData.forEach(row => {
      const domain = row.cleaned_website || '';
      if (domain) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });
    
    processedData = processedData.filter(row => {
      const domain = row.cleaned_website || '';
      return !domain || domainCounts[domain] <= 5;
    });
    
    updateTask(taskId, { progress: 60 });
    
    // Step 4: Process other_dm_name for repeated domains
    const domainGroups: Record<string, Array<{
      row: Record<string, any>,
      emails: Array<{ email: string, fullName: string }>
    }>> = {};
    
    // Group rows by domain and collect emails + full names
    processedData.forEach(row => {
      const domain = row.cleaned_website || '';
      if (!domain) return;
      
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      
      const emails: Array<{ email: string, fullName: string }> = [];
      
      ['1', '2', '3'].forEach(num => {
        const email = row[`email_${num}`] || '';
        const fullName = row[`email_${num}_full_name`] || '';
        
        if (email && fullName && !isGenericEmail(email)) {
          emails.push({ email, fullName });
        }
      });
      
      if (emails.length > 0) {
        domainGroups[domain].push({ row, emails });
      }
    });
    
    // Assign other_dm_name using round robin
    Object.keys(domainGroups).forEach(domain => {
      const group = domainGroups[domain];
      
      if (group.length > 1) {
        // Collect all email-fullName pairs across all rows
        const allEmailFullNames: Array<{ email: string, fullName: string }> = [];
        group.forEach(item => {
          item.emails.forEach(emailData => {
            allEmailFullNames.push(emailData);
          });
        });
        
        if (allEmailFullNames.length <= 1) return;
        
        // Assign alternates
        group.forEach(item => {
          item.emails.forEach((emailData, idx) => {
            // Find an alternate that's not from this email
            let alternateIdx = (allEmailFullNames.findIndex(e => e.email === emailData.email) + 1) % allEmailFullNames.length;
            
            // Make sure we don't pick ourselves
            while (allEmailFullNames[alternateIdx].email === emailData.email) {
              alternateIdx = (alternateIdx + 1) % allEmailFullNames.length;
            }
            
            // For the primary email (email_1), set the other_dm_name on the row
            if (idx === 0 || item.row['email_1'] === emailData.email) {
              item.row.other_dm_name = allEmailFullNames[alternateIdx].fullName;
            }
          });
        });
      }
    });
    
    updateTask(taskId, { progress: 75 });
    
    // Step 5: Process MX records (10 at a time)
    const batchSize = 10;
    let processedEmails = 0;
    
    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize);
      const promises = batch.map(async (row) => {
        // Process all email columns
        for (let j = 1; j <= 3; j++) {
          const emailKey = `email_${j}`;
          const email = row[emailKey] || '';
          
          if (email) {
            const domain = email.split('@')[1] || '';
            if (domain) {
              row[`mx_provider_${j}`] = await getMxProvider(domain);
              processedEmails++;
            }
          }
        }
        
        return row;
      });
      
      await Promise.all(promises);
      
      const progress = Math.min(75 + Math.floor((i + batch.length) / processedData.length * 15), 90);
      updateTask(taskId, { progress });
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
    
    // Convert data to CSV
    const csv = Papa.unparse(task.result);
    
    // Create a blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set file name with timestamp
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
