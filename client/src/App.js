import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import AIAssistant from './pages/AIAssistant';
import AIFloatingButton from './components/AIFloatingButton';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<AIAssistant />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AIFloatingButton />
      </div>
    </Router>
  );
}

export default App;
