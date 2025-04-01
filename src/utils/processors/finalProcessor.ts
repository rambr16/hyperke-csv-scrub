import { COLUMNS_TO_REMOVE } from '@/utils/csvConstants';

export const finalizeProcessedData = (
  processedData: Array<Record<string, any>>
): Array<Record<string, any>> => {
  // Filter out rows where BOTH conditions are true:
  // 1. cleaned_website is not blank/null AND
  // 2. domain_occurrence_count > 6
  const filteredData = processedData.filter(row => {
    if (row.cleaned_website && 
        row.cleaned_website.trim() !== '' && 
        parseInt(row.domain_occurrence_count) > 6) {
      row.to_be_deleted = 'Yes (Domain Frequency > 6)';
      return false; // Remove the row
    }
    
    return true; // Keep all other rows
  });

  // Create a new array with the modified rows
  const finalData = filteredData.map(row => {
    // Create a new object with only the columns we want to keep
    const newRow: Record<string, any> = {};
    
    Object.keys(row).forEach(column => {
      // Check if this is an email column we should preserve
      const isEmailRelatedColumn = 
        column === 'email' ||
        column === 'full_name' || 
        column === 'first_name' || 
        column === 'last_name' || 
        column === 'title' || 
        column === 'phone' ||
        column.startsWith('email_');  // Keep ALL email_X columns including email_1, email_2, etc.
      
      // Only add columns that aren't in the COLUMNS_TO_REMOVE list 
      // or are email information columns we want to preserve
      if (!COLUMNS_TO_REMOVE.includes(column) || isEmailRelatedColumn) {
        newRow[column] = row[column];
      }
    });
    
    return newRow;
  })
  // Filter out rows marked for deletion
  .filter(row => 
    row.to_be_deleted !== 'Yes (Domain Frequency > 6)' && 
    row.to_be_deleted !== 'Yes (Duplicate Email)' &&
    row.to_be_deleted !== 'Yes (All Emails Duplicate)'
  );
  
  return finalData;
};
