
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

  return {
    downloadResult
  };
};
