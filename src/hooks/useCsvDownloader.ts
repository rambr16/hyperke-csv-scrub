
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
        console.log("First name in data:", task.result[0].first_name);
        console.log("Last name in data:", task.result[0].last_name);
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
