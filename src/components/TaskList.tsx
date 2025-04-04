
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

  // Helper function to check if a column exists and has data in the result
  const hasColumn = (result: Array<Record<string, any>>, columnName: string) => {
    return result.some(row => row[columnName] !== undefined);
  };

  // Filter the results for preview - matching exactly with downloader logic
  const getFilteredPreviewData = (result: Array<Record<string, any>>) => {
    return result.filter(row => {
      // Only filter out if BOTH conditions are true:
      // 1. cleaned_website is not blank/null AND
      // 2. domain_occurrence_count > 6
      if (row.cleaned_website && 
          row.cleaned_website.trim() !== '' && 
          parseInt(row.domain_occurrence_count) > 6) {
        return false; // Remove the row
      }
      
      return true; // Keep all other rows
    });
  };

  // Check if cleaned_company_name is longer than 32 characters
  const isCompanyNameTooLong = (value: string | undefined) => {
    if (!value) return false;
    return value.length > 32;
  };

  // Helper to get display value for a row field that could be in various columns
  const getDisplayValue = (row: Record<string, any>, fieldType: string) => {
    // For the primary consolidated fields
    if (row[fieldType]) {
      return row[fieldType];
    }

    // For email-specific fields that should show in the preview
    if (fieldType === 'first_name') {
      return row.email_1_first_name || row.email_2_first_name || row.email_3_first_name || '-';
    }
    if (fieldType === 'last_name') {
      return row.email_1_last_name || row.email_2_last_name || row.email_3_last_name || '-';
    }
    if (fieldType === 'title') {
      return row.email_1_title || row.email_2_title || row.email_3_title || '-';
    }
    
    return '-';
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
                
                {/* Preview of processed data with filtering applied */}
                <div className="mt-4 border rounded overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {hasColumn(task.result, 'email') && <TableHead>Email</TableHead>}
                        {(hasColumn(task.result, 'full_name') || 
                          hasColumn(task.result, 'email_1_full_name') || 
                          hasColumn(task.result, 'email_2_full_name') || 
                          hasColumn(task.result, 'email_3_full_name')) && <TableHead>Full Name</TableHead>}
                        {(hasColumn(task.result, 'first_name') || 
                          hasColumn(task.result, 'email_1_first_name') || 
                          hasColumn(task.result, 'email_2_first_name') || 
                          hasColumn(task.result, 'email_3_first_name')) && <TableHead>First Name</TableHead>}
                        {(hasColumn(task.result, 'last_name') || 
                          hasColumn(task.result, 'email_1_last_name') || 
                          hasColumn(task.result, 'email_2_last_name') || 
                          hasColumn(task.result, 'email_3_last_name')) && <TableHead>Last Name</TableHead>}
                        {(hasColumn(task.result, 'title') || 
                          hasColumn(task.result, 'email_1_title') || 
                          hasColumn(task.result, 'email_2_title') || 
                          hasColumn(task.result, 'email_3_title')) && <TableHead>Title</TableHead>}
                        {hasColumn(task.result, 'other_dm_name') && <TableHead>Other DM Name</TableHead>}
                        {hasColumn(task.result, 'cleaned_website') && <TableHead>Domain</TableHead>}
                        {hasColumn(task.result, 'cleaned_company_name') && <TableHead>Company</TableHead>}
                        {hasColumn(task.result, 'mx_provider') && <TableHead>MX Provider</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredPreviewData(task.result).slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          {hasColumn(task.result, 'email') && <TableCell>{row.email || '-'}</TableCell>}
                          {(hasColumn(task.result, 'full_name') || 
                            hasColumn(task.result, 'email_1_full_name') || 
                            hasColumn(task.result, 'email_2_full_name') || 
                            hasColumn(task.result, 'email_3_full_name')) && 
                            <TableCell>{getDisplayValue(row, 'full_name')}</TableCell>}
                          {(hasColumn(task.result, 'first_name') || 
                            hasColumn(task.result, 'email_1_first_name') || 
                            hasColumn(task.result, 'email_2_first_name') || 
                            hasColumn(task.result, 'email_3_first_name')) && 
                            <TableCell>{getDisplayValue(row, 'first_name')}</TableCell>}
                          {(hasColumn(task.result, 'last_name') || 
                            hasColumn(task.result, 'email_1_last_name') || 
                            hasColumn(task.result, 'email_2_last_name') || 
                            hasColumn(task.result, 'email_3_last_name')) && 
                            <TableCell>{getDisplayValue(row, 'last_name')}</TableCell>}
                          {(hasColumn(task.result, 'title') || 
                            hasColumn(task.result, 'email_1_title') || 
                            hasColumn(task.result, 'email_2_title') || 
                            hasColumn(task.result, 'email_3_title')) && 
                            <TableCell>{getDisplayValue(row, 'title')}</TableCell>}
                          {hasColumn(task.result, 'other_dm_name') && 
                            <TableCell className="font-medium">{row.other_dm_name || '-'}</TableCell>}
                          {hasColumn(task.result, 'cleaned_website') && 
                            <TableCell>{row.cleaned_website || '-'}</TableCell>}
                          {hasColumn(task.result, 'cleaned_company_name') && (
                            <TableCell className={isCompanyNameTooLong(row.cleaned_company_name) ? 'bg-red-100 text-red-800' : ''}>
                              {row.cleaned_company_name || '-'}
                            </TableCell>
                          )}
                          {hasColumn(task.result, 'mx_provider') && 
                            <TableCell>{row.mx_provider || '-'}</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {task.result.length > 5 && (
                    <div className="p-2 text-center text-sm text-gray-500">
                      Showing 5 of {getFilteredPreviewData(task.result).length} rows. Download for complete data.
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
