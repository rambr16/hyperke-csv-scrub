import { COLUMNS_TO_REMOVE, CRITICAL_COLUMNS } from '@/utils/csvConstants';

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

  console.log("Starting finalizeProcessedData. Sample row before processing:", 
    filteredData.length > 0 ? JSON.stringify(Object.keys(filteredData[0]).filter(k => k.includes('name'))) : 'No data');

  // Create a new array with the modified rows
  const finalData = filteredData.map(row => {
    // Create a new object with only the columns we want to keep
    const newRow: Record<string, any> = {};
    
    Object.keys(row).forEach(column => {
      // Check if this is a critical column we should always preserve
      const isCriticalColumn = CRITICAL_COLUMNS.includes(column) || column.startsWith('email_');
      
      // Log when we encounter important name fields
      if (column === 'first_name' || column === 'last_name' || 
          column.includes('_first_name') || column.includes('_last_name')) {
        console.log(`Finalizer processing column: ${column} = ${row[column]}`);
      }
      
      // Only add columns that aren't in the COLUMNS_TO_REMOVE list 
      // or are columns we want to preserve
      if (!COLUMNS_TO_REMOVE.includes(column) || isCriticalColumn) {
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
  
  // Additional debugging
  if (finalData.length > 0) {
    const sampleRow = finalData[0];
    console.log('Final output sample row keys:', Object.keys(sampleRow));
    console.log('Sample first_name:', sampleRow.first_name);
    console.log('Sample last_name:', sampleRow.last_name);
    console.log('Name columns in output:', Object.keys(sampleRow).filter(k => k.includes('name')));
  }
  
  return finalData;
};
