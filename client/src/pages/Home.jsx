import React from 'react';
import { Navigate } from 'react-router-dom';

const Home = () => {
  // For now, we'll just redirect to the AI Assistant page
  // In the future, this could be a proper landing page
  return <Navigate to="/ai-assistant" replace />;
};

export default Home;
