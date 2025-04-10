
import React, { useState, useEffect } from 'react';
import { useCsv, CsvType } from '@/contexts/CsvContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ColumnMapper = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { getTask, processCsv } = useCsv();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(() => {
    if (!taskId) return null;
    return getTask(taskId);
  });
  
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!taskId) {
      navigate('/');
      return;
    }
    
    const task = getTask(taskId);
    if (!task) {
      navigate('/');
      return;
    }
    
    setTask(task);
  }, [taskId, getTask, navigate]);

  const getRequiredFields = (csvType: CsvType): Array<{ key: string, label: string, help: string }> => {
    switch (csvType) {
      case 'domain_only':
        return [
          { 
            key: 'website', 
            label: 'Website/URL Column', 
            help: 'Select the column that contains website URLs to be cleaned' 
          }
        ];
        
      case 'single_email':
        return [
          { 
            key: 'email', 
            label: 'Email Column', 
            help: 'Select the column that contains email addresses' 
          },
          { 
            key: 'website', 
            label: 'Website Column (Optional)', 
            help: 'Select the column that contains website URLs' 
          },
          { 
            key: 'company', 
            label: 'Company Name Column (Optional)', 
            help: 'Select the column that contains company names to be cleaned' 
          }
        ];
        
      case 'multiple_email':
        return [
          { 
            key: 'company', 
            label: 'Company Name Column (Optional)', 
            help: 'Select the column that contains company names to be cleaned' 
          },
          { 
            key: 'website', 
            label: 'Website Column (Optional)', 
            help: 'Select the column that contains website URLs' 
          }
        ];
        
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskId) return;
    
    setIsProcessing(true);
    
    try {
      await processCsv(taskId, mapping);
      navigate('/');
    } catch (error) {
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!task || !task.originalHeaders) {
    return <div>Loading...</div>;
  }

  const requiredFields = getRequiredFields(task.csvType || 'unknown');

  // Filter out any empty header values to prevent the SelectItem error
  const validHeaders = task.originalHeaders.filter(header => header && header.trim() !== '');

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-hyperke-600">Map CSV Columns</CardTitle>
          <CardDescription>
            Please map the required columns from your CSV file
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {task.csvType === 'unknown' ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-md">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">CSV Type Not Recognized</p>
                <p className="text-sm">
                  We couldn't automatically detect the structure of your CSV file. 
                  Please make sure it follows one of the supported formats:
                </p>
                <ul className="list-disc ml-5 mt-2 text-sm">
                  <li>CSV with website/domain columns only</li>
                  <li>CSV with a single email column</li>
                  <li>CSV with multiple email columns (email_1, email_2, email_3)</li>
                </ul>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="py-2 px-4 bg-gray-50 rounded-md text-sm mb-4">
                <p className="font-medium text-gray-700">Detected CSV Type:</p>
                <p className="mt-1 text-gray-600">
                  {task.csvType === 'domain_only' && 'CSV with website/domain columns'}
                  {task.csvType === 'single_email' && 'CSV with a single email column'}
                  {task.csvType === 'multiple_email' && 'CSV with multiple email columns'}
                </p>
              </div>
              
              {requiredFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle size={14} className="text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>{field.help}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <Select
                    value={mapping[field.key] || ''}
                    onValueChange={(value) => setMapping({ ...mapping, [field.key]: value })}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {validHeaders.length > 0 ? (
                        validHeaders.map((header) => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-headers-found">No valid headers found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isProcessing || task.csvType === 'unknown' || Object.keys(mapping).length === 0}
            className="bg-hyperke-600 hover:bg-hyperke-700"
          >
            {isProcessing ? 'Processing...' : 'Process CSV'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ColumnMapper;
