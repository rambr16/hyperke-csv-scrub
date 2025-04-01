
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
      // Define critical columns that must be preserved
      const isCriticalColumn = 
        key === 'email' ||
        key === 'full_name' || 
        key === 'first_name' || 
        key === 'last_name' || 
        key === 'title' || 
        key === 'phone' ||
        key === 'other_dm_name' ||
        key === 'mx_provider' ||
        key === 'cleaned_website' ||
        key === 'cleaned_company_name' ||
        key.startsWith('email_');  // Keep ALL email_X columns
      
      // Keep the column if:
      // 1. It's not in COLUMNS_TO_REMOVE, OR
      // 2. It's a critical column we must preserve
      if (!COLUMNS_TO_REMOVE.includes(key) || isCriticalColumn) {
        // For debugging name fields
        if (key === 'first_name' || key === 'last_name') {
          console.log(`CSV Export including: ${key} = ${row[key]}`);
        }
        
        // If this is the company name field and it's too long, prefix with !!TOO_LONG!!
        if (key === 'cleaned_company_name' && row[key] && row[key].length > 32) {
          exportRow[key] = `!!TOO_LONG!! ${row[key]}`;
        } else {
          exportRow[key] = row[key];
        }
      }
    }
    
    return exportRow;
  });
  
  console.log(`Export data includes ${exportData.length} rows`);
  
  // Sample the columns in the first row for debugging
  if (exportData.length > 0) {
    console.log('Columns in export:', Object.keys(exportData[0]));
    console.log('First name in export:', exportData[0].first_name);
    console.log('Last name in export:', exportData[0].last_name);
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
