
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
  
  // Log presence of email-specific name fields before processing
  if (filteredData.length > 0) {
    const firstRow = filteredData[0];
    const emailNameFields = Object.keys(firstRow).filter(k => 
      k.startsWith('email_') && (k.includes('first_name') || k.includes('last_name'))
    );
    console.log("Email name fields before processing:", emailNameFields);
    emailNameFields.forEach(field => {
      console.log(`${field} before processing:`, firstRow[field]);
    });
  }

  // Create a new array with the modified rows
  const finalData = filteredData.map(row => {
    // Create a new object with only the columns we want to keep
    const newRow: Record<string, any> = {};
    
    Object.keys(row).forEach(column => {
      // Check if this is a critical column we should always preserve
      const isCriticalColumn = CRITICAL_COLUMNS.includes(column) || 
                              column.startsWith('email_') || 
                              column === 'first_name' || 
                              column === 'last_name' || 
                              column === 'full_name';
      
      // Log when we encounter important email name fields
      if (column.startsWith('email_') && (column.includes('first_name') || column.includes('last_name'))) {
        console.log(`Finalizer processing email name field: ${column} = ${row[column]}`);
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
    
    // Log all email-specific name fields in the final output
    const emailNameFields = Object.keys(sampleRow).filter(k => 
      k.startsWith('email_') && (k.includes('first_name') || k.includes('last_name'))
    );
    console.log('Email name fields in final output:', emailNameFields);
    
    // Log values for each email name field
    emailNameFields.forEach(field => {
      console.log(`${field} in final output:`, sampleRow[field]);
    });
  }
  
  return finalData;
};
