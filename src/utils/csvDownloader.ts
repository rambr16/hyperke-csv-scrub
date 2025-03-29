
import Papa from 'papaparse';
import { Task } from '@/types/csv';

export const downloadCsvResult = (task: Task) => {
  if (!task || !task.result) {
    throw new Error("No processed data found for this task");
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
  
  return filename;
};
