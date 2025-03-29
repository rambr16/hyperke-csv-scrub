
import Papa from 'papaparse';
import { Task } from '@/types/csv';
import { COLUMNS_TO_REMOVE } from '@/utils/csvConstants';

export const downloadCsvResult = (task: Task) => {
  if (!task || !task.result) {
    throw new Error("No processed data found for this task");
  }
  
  // Ensure we're working with a clean copy of the data
  const cleanedData = task.result.map(row => {
    const cleanRow: Record<string, any> = {};
    
    // Only include columns that aren't in the COLUMNS_TO_REMOVE list
    Object.keys(row).forEach(key => {
      if (!COLUMNS_TO_REMOVE.includes(key)) {
        cleanRow[key] = row[key];
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
