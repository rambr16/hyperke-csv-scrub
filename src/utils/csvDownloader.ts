import Papa from 'papaparse';
import { Task } from '@/types/csv';
import { COLUMNS_TO_REMOVE, CRITICAL_COLUMNS } from '@/utils/csvConstants';

export const downloadCsvResult = (task: Task) => {
  if (!task || !task.result) {
    throw new Error("No processed data found for this task");
  }
  
  console.log("Starting CSV download with columns:", 
    task.result.length > 0 ? Object.keys(task.result[0]).filter(k => k.includes('name')) : 'No data');
  
  // Log all email-specific name fields to verify they exist in the input data
  if (task.result.length > 0) {
    const firstRow = task.result[0];
    const emailFields = Object.keys(firstRow).filter(k => k.startsWith('email_'));
    console.log("All email fields in data:", emailFields);
    
    const emailNameFields = emailFields.filter(k => k.includes('first_name') || k.includes('last_name'));
    console.log("Email name fields in data:", emailNameFields);
    
    emailNameFields.forEach(field => {
      console.log(`Field ${field} value:`, firstRow[field]);
    });
  }
  
  // Filter out rows where cleaned_website is not blank AND domain_occurrence_count > 6
  const filteredData = task.result.filter(row => {
    // Only filter out if BOTH conditions are true:
    // 1. cleaned_website is not blank/null AND 
    // 2. domain_occurrence_count > 6
    if (row.cleaned_website && 
        row.cleaned_website.trim() !== '' && 
        parseInt(row.domain_occurrence_count) > 6) {
      return false; // Remove the row
    }
    
    return true; // Keep all other rows
  });
  
  // Prepare the data for CSV export
  const exportData = filteredData.map(row => {
    const exportRow: Record<string, any> = {};
    
    // First, ensure all critical columns are included
    CRITICAL_COLUMNS.forEach(key => {
      if (row[key] !== undefined) {
        exportRow[key] = row[key];
      }
    });
    
    // Now process each column in the row
    Object.keys(row).forEach(key => {
      // Skip columns that are already added from CRITICAL_COLUMNS
      if (exportRow[key] !== undefined) {
        return;
      }
      
      // Check if this is a critical column we must preserve
      const isCriticalColumn = CRITICAL_COLUMNS.includes(key) || 
                              key.startsWith('email_') || 
                              key === 'first_name' || 
                              key === 'last_name' || 
                              key === 'full_name';
      
      // Log any email name fields to verify they're being processed
      if (key.startsWith('email_') && (key.includes('first_name') || key.includes('last_name'))) {
        console.log(`Processing email name field: ${key} = ${row[key]}`);
      }
      
      // Keep the column if:
      // 1. It's not in COLUMNS_TO_REMOVE, OR
      // 2. It's a critical column we must preserve
      if (!COLUMNS_TO_REMOVE.includes(key) || isCriticalColumn) {
        // Debug log for important fields
        if (key.includes('first_name') || key.includes('last_name')) {
          console.log(`CSV Export including name field: ${key} = ${row[key]}`);
        }
        
        // If this is the company name field and it's too long, prefix with !!TOO_LONG!!
        if (key === 'cleaned_company_name' && row[key] && row[key].length > 32) {
          exportRow[key] = `!!TOO_LONG!! ${row[key]}`;
        } else {
          exportRow[key] = row[key];
        }
      }
    });
    
    return exportRow;
  });
  
  console.log(`Export data includes ${exportData.length} rows`);
  
  // Sample the columns in the first row for debugging
  if (exportData.length > 0) {
    console.log('Columns in export:', Object.keys(exportData[0]));
    
    // Log all email-related name fields in the export
    const emailNameFields = Object.keys(exportData[0]).filter(k => 
      k.startsWith('email_') && (k.includes('first_name') || k.includes('last_name'))
    );
    console.log('Email name fields in export:', emailNameFields);
    
    // Log values for each email name field
    emailNameFields.forEach(field => {
      console.log(`${field} in export:`, exportData[0][field]);
    });
  }
  
  const csv = Papa.unparse(exportData);
  
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
  
  return filename;
};
