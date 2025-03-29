
export type CsvType = 'domain_only' | 'single_email' | 'multiple_email' | 'unknown';

export interface Task {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Array<Record<string, any>>;
  mappedColumns?: Record<string, string>;
  csvType?: CsvType;
  originalHeaders?: string[];
  error?: string;
}

export interface CsvContextType {
  tasks: Task[];
  addTask: (file: File) => Promise<string>;
  getTask: (id: string) => Task | undefined;
  updateTask: (id: string, updates: Partial<Task>) => void;
  resetTasks: () => void;
  detectCsvType: (headers: string[]) => CsvType;
  processCsv: (taskId: string, mappedColumns: Record<string, string>) => Promise<void>;
  downloadResult: (taskId: string) => void;
}
