import Papa from 'papaparse';
import { Task } from '@/types/csv';
import { COLUMNS_TO_REMOVE } from '@/utils/csvConstants';

export const downloadCsvResult = (task: Task) => {
  if (!task || !task.result) {
    throw new Error("No processed data found for this task");
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
    
    // Process each column in the row
    for (const key of Object.keys(row)) {
      // Check if this is an email-related column we want to preserve
      const isEmailRelatedColumn = 
        key === 'email' ||
        key === 'full_name' || 
        key === 'first_name' || 
        key === 'last_name' || 
        key === 'title' || 
        key === 'phone' ||
        key.startsWith('email_');  // Keep ALL email_X columns including email_1, email_2, etc.
      
      // Keep the column if:
      // 1. It's not in COLUMNS_TO_REMOVE, OR
      // 2. It's an email-related column we want to preserve
      if (!COLUMNS_TO_REMOVE.includes(key) || isEmailRelatedColumn) {
        // If this is the company name field and it's too long, prefix with !!TOO_LONG!!
        if (key === 'cleaned_company_name' && row[key] && row[key].length > 32) {
          exportRow[key] = `!!TOO_LONG!! ${row[key]}`;
        } else {
          exportRow[key] = row[key];
        }
        
        // For debugging
        if (key === 'full_name' || key === 'first_name' || key === 'last_name' || key === 'title' || 
            key.includes('_full_name') || key.includes('_first_name') || 
            key.includes('_last_name') || key.includes('_title')) {
          console.log(`Including in export: ${key} = ${row[key]}`);
        }
      }
    }
    
    return exportRow;
  });
  
  console.log(`Export data includes ${exportData.length} rows`);
  
  // Sample the columns in the first row for debugging
  if (exportData.length > 0) {
    console.log('Columns in export:', Object.keys(exportData[0]));
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
