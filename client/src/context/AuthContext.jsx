import React, { createContext, useState, useEffect, useContext } from 'react';

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          // This would normally validate the token with the server
          // For now, we'll just parse the JWT to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          if (payload.exp * 1000 < Date.now()) {
            // Token expired
            localStorage.removeItem('token');
            setCurrentUser(null);
          } else {
            // Set user from token
            setCurrentUser({
              uid: payload.uid,
              email: payload.email,
              role: payload.role
            });
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Sign in function
  const signIn = async (email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      // This would normally call the API
      // For now, we'll simulate a successful login
      console.log('Signing in with:', email, password);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock token (in production this would come from the server)
      const mockUser = {
        uid: 'user123',
        email,
        role: 'user'
      };
      
      const mockToken = createMockJwt(mockUser);
      
      // Store token
      localStorage.setItem('token', mockToken);
      
      // Set user
      setCurrentUser(mockUser);
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email, password, displayName) => {
    setError(null);
    setLoading(true);
    
    try {
      // This would normally call the API
      console.log('Signing up with:', email, password, displayName);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to create account');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // This would normally call the API
      console.log('Signing out');
      
      // Remove token
      localStorage.removeItem('token');
      
      // Clear user
      setCurrentUser(null);
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to sign out');
      return { success: false, error: err.message };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    setError(null);
    setLoading(true);
    
    try {
      // This would normally call the API
      console.log('Requesting password reset for:', email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to request password reset');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Helper to create a mock JWT token
  const createMockJwt = (user) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + (60 * 30) // 30 minutes
    }));
    const signature = btoa('mock-signature');
    
    return `${header}.${payload}.${signature}`;
  };

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
