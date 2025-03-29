
import React, { useState, useRef } from 'react';
import { useCsv } from '@/contexts/CsvContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const CsvUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addTask } = useCsv();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelection(droppedFiles[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    // Check if the file is a CSV
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: "destructive", 
        title: "Invalid file type",
        description: "Please upload a CSV file"
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a CSV file to upload"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const taskId = await addTask(file);
      // Create a hidden input to store the file for later processing
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = taskId;
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      // Create a DataTransfer object to set the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been added to the task queue`
      });
      
      // Reset the form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Navigate to the mapping page
      navigate(`/mapping/${taskId}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-hyperke-500 bg-hyperke-50' : 'border-gray-300 hover:border-hyperke-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center">
          <Upload size={40} className={`mb-4 ${isDragging ? 'text-hyperke-500' : 'text-gray-400'}`} />
          <p className="text-lg font-medium mb-1">
            {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <Button type="button" variant="outline" size="sm">
            Select CSV File
          </Button>
        </div>
      </div>

      {file && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-hyperke-100 rounded">
                <FileText size={20} className="text-hyperke-600" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="bg-hyperke-600 hover:bg-hyperke-700"
            >
              {isUploading ? 'Uploading...' : 'Process CSV'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CsvUploader;
