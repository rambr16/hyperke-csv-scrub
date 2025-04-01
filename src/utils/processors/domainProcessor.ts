
import { Task } from '@/types/csv';
import { cleanDomain } from '@/utils/domainUtils';

export const processDomainOnlyCsv = async (
  data: Array<Record<string, any>>, 
  mappedColumns: Record<string, string>,
  taskId: string,
  updateTask: (id: string, updates: Partial<Task>) => void
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
