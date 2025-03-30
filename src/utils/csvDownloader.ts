
import Papa from 'papaparse';
import { Task } from '@/types/csv';
import { COLUMNS_TO_REMOVE } from '@/utils/csvConstants';

export const downloadCsvResult = (task: Task) => {
  if (!task || !task.result) {
    throw new Error("No processed data found for this task");
  }
  
  // Filter out rows where cleaned_website is not blank AND domain_occurrence_count > 6
  const filteredData = task.result.filter(row => {
    // Skip filtering if cleaned_website is blank or null
    if (!row.cleaned_website || row.cleaned_website.trim() === '') {
      return true; // Keep the row
    }
    
    // If domain_occurrence_count > 6, remove the row
    if (row.domain_occurrence_count > 6) {
      return false;
    }
    
    return true; // Keep the row if it passes the checks
  });
  
  // Ensure we're working with a clean copy of the data
  const cleanedData = filteredData.map(row => {
    const cleanRow: Record<string, any> = {};
    
    // Check if company name is too long (more than 32 characters)
    const isCompanyNameTooLong = row.cleaned_company_name && row.cleaned_company_name.length > 32;
    
    // Only include columns that aren't in the COLUMNS_TO_REMOVE list
    Object.keys(row).forEach(key => {
      if (!COLUMNS_TO_REMOVE.includes(key)) {
        cleanRow[key] = row[key];
      }
    });
    
    return cleanRow;
  });
  
  // Prepare the CSV data with HTML styling for too long company names
  let csvContent = '';
  
  // Generate the header row
  if (cleanedData.length > 0) {
    const headers = Object.keys(cleanedData[0]);
    csvContent += headers.join(',') + '\n';
    
    // Generate data rows with HTML styling for too long company names
    cleanedData.forEach(row => {
      const rowValues = headers.map(header => {
        let value = row[header] || '';
        
        // Check if this is the company name column and it's too long
        if (header === 'cleaned_company_name' && value.length > 32) {
          // Add HTML styling for red text (will work when opened in Excel or Google Sheets)
          value = `<span style="color: red">${value}</span>`;
        }
        
        // Escape commas and quotes in the value
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      
      csvContent += rowValues.join(',') + '\n';
    });
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
