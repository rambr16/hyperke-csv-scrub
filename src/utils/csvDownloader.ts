import Papa from 'papaparse';
import { Task } from '@/types/csv';
import { COLUMNS_TO_REMOVE } from '@/utils/csvConstants';

export const downloadCsvResult = (task: Task) => {
  if (!task || !task.result) {
    throw new Error("No processed data found for this task");
  }
  
  // Filter out rows where cleaned_website is not blank AND domain_occurrence_count > 6
  const filteredData = task.result.filter(row => {
    // Always keep rows with unique emails regardless of domain count
    // Only filter out if BOTH conditions are true:
    // 1. cleaned_website is not blank/null AND 
    // 2. domain_occurrence_count > 6
    if (row.cleaned_website && 
        row.cleaned_website.trim() !== '' && 
        row.domain_occurrence_count > 6) {
      return false; // Remove the row
    }
    
    return true; // Keep all other rows
  });
  
  // Ensure we're working with a clean copy of the data
  const cleanedData = filteredData.map(row => {
    const cleanRow: Record<string, any> = {};
    
    // Only include columns that aren't in the COLUMNS_TO_REMOVE list
    Object.keys(row).forEach(key => {
      if (!COLUMNS_TO_REMOVE.includes(key)) {
        // If this is the company name field and it's too long, prefix with !!TOO_LONG!!
        if (key === 'cleaned_company_name' && row[key] && row[key].length > 32) {
          cleanRow[key] = `!!TOO_LONG!! ${row[key]}`;
        } else {
          cleanRow[key] = row[key];
        }
      }
    });
    
    return cleanRow;
  });
  
  const csv = Papa.unparse(cleanedData);
  
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
