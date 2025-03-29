
import { useState } from 'react';
import { Task } from '@/types/csv';
import { useToast } from "@/components/ui/use-toast";

export const useCsvTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

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

  return {
    tasks,
    setTasks,
    getTask,
    updateTask,
    resetTasks
  };
};
