
import { useToast } from "@/components/ui/use-toast";
import { downloadCsvResult } from '@/utils/csvDownloader';
import { Task } from '@/types/csv';

export const useCsvDownloader = (
  getTask: (id: string) => Task | undefined
) => {
  const { toast } = useToast();

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
      // Add debug logs to check available data
      if (task.result.length > 0) {
        console.log("Download requested. Sample data:", 
          Object.keys(task.result[0]).filter(k => k.includes('name')));
        
        // Log all email-specific name fields in the task result
        const emailNameFields = Object.keys(task.result[0]).filter(k => 
          k.startsWith('email_') && (k.includes('first_name') || k.includes('last_name'))
        );
        console.log('Email name fields in task result:', emailNameFields);
        
        // Log values for each email name field
        emailNameFields.forEach(field => {
          console.log(`${field} in task result:`, task.result[0][field]);
        });
      }
      
      const filename = downloadCsvResult(task);
      toast({
        title: "Download started",
        description: `File: ${filename}`
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message
      });
    }
  };

  return {
    downloadResult
  };
};
