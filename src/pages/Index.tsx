
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard if logged in, otherwise to login page
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Return a loading message while redirecting
  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
};

export default Index;
