
import React, { createContext, useState, useContext } from 'react';
import Papa from 'papaparse';
import { useToast } from "@/components/ui/use-toast";
import { CsvType, Task, CsvContextType } from '@/types/csv';
import { detectCsvType } from '@/utils/csvTypeDetector';
import { downloadCsvResult } from '@/utils/csvDownloader';
import { 
  processDomainOnlyCsv, 
  processSingleEmailCsv, 
  processMultipleEmailCsv,
  finalizeProcessedData
} from '@/utils/csvProcessors';

const CsvContext = createContext<CsvContextType>({
  tasks: [],
  addTask: async () => '',
  getTask: () => undefined,
  updateTask: () => {},
  resetTasks: () => {},
  detectCsvType: () => 'unknown',
  processCsv: async () => {},
  downloadResult: () => {}
});

export const useCsv = () => useContext(CsvContext);

export { CsvType };

export const CsvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
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
            
            setTasks(prev => [...prev, newTask]);
            resolve(taskId);
          } else {
            toast({
              variant: "destructive",
              title: "Invalid CSV",
              description: "The uploaded file is not a valid CSV or is empty."
            });
            reject(new Error("Invalid CSV file"));
          }
        },
        error: (error) => {
          toast({
            variant: "destructive",
            title: "Error parsing CSV",
            description: error.message
          });
          reject(error);
        }
      });
    });
  };

  const getTask = (id: string) => {
    return tasks.find(task => task.id === id);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, ...updates } : task
      )
    );
  };

  const resetTasks = () => {
    setTasks([]);
    toast({
      title: "Reset successful",
      description: "All tasks have been cleared"
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

  const downloadResult = (taskId: string) => {
    const task = getTask(taskId);
    if (!task || !task.result) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "No processed data found for this task"
      });
      return;
    }
    
    try {
      const filename = downloadCsvResult(task);
      toast({
        title: "Download started",
        description: `File: ${filename}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message
      });
    }
  };

  return (
    <CsvContext.Provider value={{
      tasks,
      addTask,
      getTask,
      updateTask,
      resetTasks,
      detectCsvType,
      processCsv,
      downloadResult
    }}>
      {children}
    </CsvContext.Provider>
  );
};
