
import Papa from 'papaparse';
import { useToast } from "@/components/ui/use-toast";
import { Task } from '@/types/csv';
import { detectCsvType } from '@/utils/csvTypeDetector';
import { 
  processDomainOnlyCsv, 
  processSingleEmailCsv, 
  processMultipleEmailCsv,
  finalizeProcessedData
} from '@/utils/csvProcessors';
import { batchFetchMxRecords } from '@/utils/mxUtils';

export const useCsvProcessor = (
  getTask: (id: string) => Task | undefined,
  updateTask: (id: string, updates: Partial<Task>) => void
) => {
  const { toast } = useToast();

  const addTask = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields && results.meta.fields.length > 0) {
            const taskId = Date.now().toString();
            const newTask: Task = {
              id: taskId,
              filename: file.name,
              status: 'pending',
              progress: 0,
              originalHeaders: results.meta.fields,
              csvType: detectCsvType(results.meta.fields)
            };
            
            resolve(taskId);
            return newTask;
          } else {
            toast({
              variant: "destructive",
              title: "Invalid CSV",
              description: "The uploaded file is not a valid CSV or is empty."
            });
            reject(new Error("Invalid CSV file"));
            return null;
          }
        },
        error: (error) => {
          toast({
            variant: "destructive",
            title: "Error parsing CSV",
            description: error.message
          });
          reject(error);
          return null;
        }
      });
    });
  };

  const processCsv = async (taskId: string, mappedColumns: Record<string, string>) => {
    const task = getTask(taskId);
    if (!task) return;
    
    updateTask(taskId, { 
      status: 'processing', 
      progress: 5,
      mappedColumns 
    });
    
    try {
      const fileInput = document.getElementById(taskId) as HTMLInputElement;
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        throw new Error("File not found");
      }
      
      const file = fileInput.files[0];
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data } = results as { data: Array<Record<string, any>> };
          
          if (!data || data.length === 0) {
            updateTask(taskId, { 
              status: 'error', 
              error: 'No data found in CSV file' 
            });
            return;
          }
          
          updateTask(taskId, { progress: 10 });
          
          let processedData: Array<Record<string, any>> = [];
          
          switch (task.csvType) {
            case 'domain_only':
              processedData = await processDomainOnlyCsv(data, mappedColumns, taskId, updateTask);
              break;
              
            case 'single_email':
              processedData = await processSingleEmailCsv(data, mappedColumns, taskId, updateTask);
              break;
              
            case 'multiple_email':
              processedData = await processMultipleEmailCsv(data, mappedColumns, taskId, updateTask);
              break;
              
            default:
              throw new Error("Unknown CSV type");
          }
          
          // Process MX lookups in batches - OPTIMIZED VERSION
          updateTask(taskId, { progress: 70, status: 'processing' });
          
          // Collect all domains for batch processing
          const domains: string[] = processedData
            .map(row => row.cleaned_website)
            .filter(Boolean);
          
          console.log(`Starting optimized batch MX lookup for ${domains.length} domains`);
          
          try {
            // Use our improved batch fetching with larger batch size and caching
            const mxResults = await batchFetchMxRecords(
              domains,
              30 // Increased batch size for fewer API calls
            );
            
            console.log(`MX lookup completed for ${Object.keys(mxResults).length} domains`);
            
            // Update processed data with MX results
            processedData = processedData.map(row => {
              if (row.cleaned_website && mxResults[row.cleaned_website]) {
                return {
                  ...row,
                  mx_provider: mxResults[row.cleaned_website]
                };
              }
              return row;
            });
          } catch (error) {
            console.error("Error during MX batch processing:", error);
            // Continue with processing even if MX lookup fails
          }
          
          // Apply final processing to all data
          processedData = finalizeProcessedData(processedData);
          
          updateTask(taskId, { 
            status: 'completed', 
            progress: 100,
            result: processedData
          });
          
          toast({
            title: "Processing complete",
            description: `Successfully processed ${processedData.length} rows`
          });
        },
        error: (error) => {
          updateTask(taskId, { 
            status: 'error', 
            error: error.message 
          });
          
          toast({
            variant: "destructive",
            title: "Processing error",
            description: error.message
          });
        }
      });
    } catch (error: any) {
      updateTask(taskId, { 
        status: 'error', 
        error: error.message 
      });
      
      toast({
        variant: "destructive",
        title: "Processing error",
        description: error.message
      });
    }
  };

  return {
    addTask,
    processCsv
  };
};
