
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCsv } from '@/contexts/CsvContext';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw, Upload, ExternalLink, BarChart } from 'lucide-react';
import CsvUploader from '@/components/CsvUploader';
import TaskList from '@/components/TaskList';

const Dashboard = () => {
  const { logout } = useAuth();
  const { resetTasks } = useCsv();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleReset = () => {
    resetTasks();
  };

  const handleCsvSplitterClick = () => {
    window.open('https://splitcsv.netlify.app', '_blank');
  };

  const handleHyperkeReportClick = () => {
    window.open('https://hyperke-report.netlify.app/', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-hyperke-600">Hyperke CSV Cleaner</h1>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleCsvSplitterClick}
            >
              <ExternalLink size={16} />
              CSV Splitter
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleHyperkeReportClick}
            >
              <BarChart size={16} />
              Hyperke Report
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={handleReset}
            >
              <RefreshCw size={16} />
              Reset
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="grid gap-8">
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload size={20} className="text-hyperke-500" />
              Upload CSV File
            </h2>
            <CsvUploader />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Tasks</h2>
            <TaskList />
          </section>
        </div>
      </main>

      <footer className="bg-white p-4 border-t">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Hyperke CSV Cleaner. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
