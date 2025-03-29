
import React, { createContext, useContext } from 'react';
import Papa from 'papaparse';
import { CsvContextValue } from '@/types/csvContext';
import { Task } from '@/types/csv';
import { useCsvTasks } from '@/hooks/useCsvTasks';
import { useCsvProcessor } from '@/hooks/useCsvProcessor';
import { useCsvDownloader } from '@/hooks/useCsvDownloader';
import { detectCsvType } from '@/utils/csvTypeDetector';

export type { CsvType } from '@/types/csv';

const CsvContext = createContext<CsvContextValue>({
  tasks: [],
  addTask: async () => '',
  getTask: () => undefined,
  updateTask: () => {},
  resetTasks: () => {},
  detectCsvType,
  processCsv: async () => {},
  downloadResult: () => {}
});

export const useCsv = () => useContext(CsvContext);

export const CsvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tasks, getTask, updateTask, resetTasks, addTask: addTaskToState } = useCsvTasks();
  const { processCsv } = useCsvProcessor(getTask, updateTask);
  const { downloadResult } = useCsvDownloader(getTask);

  // Extend addTask to update tasks state
  const handleAddTask = async (file: File): Promise<string> => {
    const taskId = Date.now().toString();
    const newTask: Task = {
      id: taskId,
      filename: file.name,
      status: 'pending',
      progress: 0,
      originalHeaders: [], 
      csvType: 'unknown'
    };
    
    // Parse the CSV to get headers and detect CSV type
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields && results.meta.fields.length > 0) {
            newTask.originalHeaders = results.meta.fields;
            newTask.csvType = detectCsvType(results.meta.fields);
            
            // Add the task to state
            addTaskToState(newTask);
            resolve(taskId);
          } else {
            reject(new Error("Invalid CSV file"));
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  return (
    <CsvContext.Provider value={{
      tasks,
      addTask: handleAddTask,
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
