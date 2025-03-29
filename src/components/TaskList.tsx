
import React from 'react';
import { useCsv } from '@/contexts/CsvContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, File, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TaskList = () => {
  const { tasks, downloadResult } = useCsv();

  if (tasks.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <p className="text-gray-500">No tasks yet. Upload a CSV file to get started.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'processing':
        return <Clock className="text-amber-500" size={18} />;
      default:
        return <Clock className="text-gray-400" size={18} />;
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File size={18} className="text-hyperke-500" />
                <div>
                  <h3 className="font-medium">{task.filename}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    {getStatusIcon(task.status)}
                    <span>
                      {task.status === 'pending' && 'Pending'}
                      {task.status === 'processing' && 'Processing'}
                      {task.status === 'completed' && 'Completed'}
                      {task.status === 'error' && 'Error'}
                    </span>
                    {task.status === 'error' && task.error && (
                      <span className="text-red-500"> - {task.error}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {task.status === 'completed' && (
                <Button 
                  variant="outline" 
                  className="text-hyperke-600 border-hyperke-600 hover:bg-hyperke-50"
                  onClick={() => downloadResult(task.id)}
                >
                  <Download size={16} className="mr-1" />
                  Download
                </Button>
              )}
            </div>
            
            {(task.status === 'processing' || task.status === 'completed') && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>
            )}

            {task.status === 'completed' && task.result && task.result.length > 0 && (
              <div className="mt-2 space-y-4">
                <div className="text-sm text-gray-600">
                  {task.result.length} rows processed
                </div>
                
                {/* Preview of processed data */}
                <div className="mt-4 border rounded overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Other DM Name</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>MX Provider</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {task.result.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.email || '-'}</TableCell>
                          <TableCell>{row.full_name || '-'}</TableCell>
                          <TableCell className="font-medium">{row.other_dm_name || '-'}</TableCell>
                          <TableCell>{row.cleaned_website || '-'}</TableCell>
                          <TableCell>{row.mx_provider || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {task.result.length > 5 && (
                    <div className="p-2 text-center text-sm text-gray-500">
                      Showing 5 of {task.result.length} rows. Download for complete data.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TaskList;
