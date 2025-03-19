import React, { useState, useEffect } from 'react';
import DatabaseChat from '../components/DatabaseChat';

const AIAssistant = () => {
  const [databaseContext, setDatabaseContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch database context for AI
    const fetchDatabaseContext = async () => {
      try {
        setLoading(true);
        
        // This is a stub implementation - would connect to the AI API
        console.log('Fetching database context');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate database context
        const mockContext = {
          tables: [
            { 
              name: 'users', 
              fields: ['id', 'email', 'name', 'created_at'],
              rowCount: 120
            },
            { 
              name: 'projects', 
              fields: ['id', 'name', 'description', 'owner_id', 'created_at'],
              rowCount: 45
            },
            { 
              name: 'tasks', 
              fields: ['id', 'title', 'description', 'status', 'project_id', 'assigned_to', 'created_at'],
              rowCount: 230
            }
          ],
          relationships: [
            { from: 'projects.owner_id', to: 'users.id' },
            { from: 'tasks.project_id', to: 'projects.id' },
            { from: 'tasks.assigned_to', to: 'users.id' }
          ]
        };
        
        setDatabaseContext(mockContext);
      } catch (err) {
        console.error('Error fetching database context:', err);
        setError('Failed to load database context');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDatabaseContext();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Database Assistant</h1>
        <p className="mt-2 text-lg text-gray-600">
          Ask questions about your data in natural language
        </p>
      </div>
      
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Database schema sidebar */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Database Schema</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <span className="ml-2 text-gray-600">Loading schema...</span>
            </div>
          ) : databaseContext ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-medium text-gray-700">Tables</h3>
                <ul className="space-y-3">
                  {databaseContext.tables.map(table => (
                    <li key={table.name} className="rounded-md bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-indigo-600">{table.name}</span>
                        <span className="text-xs text-gray-500">{table.rowCount} rows</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {table.fields.join(', ')}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="mb-2 font-medium text-gray-700">Relationships</h3>
                <ul className="space-y-2 text-sm">
                  {databaseContext.relationships.map((rel, index) => (
                    <li key={index} className="rounded-md bg-gray-50 p-2 text-gray-600">
                      <div className="flex items-center">
                        <span>{rel.from}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        <span>{rel.to}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500">
              No schema information available
            </div>
          )}
        </div>
        
        {/* Chat interface */}
        <div className="lg:col-span-2">
          <div className="h-[600px]">
            <DatabaseChat />
          </div>
        </div>
      </div>
      
      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Example Questions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="cursor-pointer rounded-md bg-white p-3 shadow-sm hover:bg-indigo-50">
            "How many users are in the database?"
          </div>
          <div className="cursor-pointer rounded-md bg-white p-3 shadow-sm hover:bg-indigo-50">
            "Show me all projects created in the last month"
          </div>
          <div className="cursor-pointer rounded-md bg-white p-3 shadow-sm hover:bg-indigo-50">
            "List tasks assigned to user with ID 5"
          </div>
          <div className="cursor-pointer rounded-md bg-white p-3 shadow-sm hover:bg-indigo-50">
            "What's the average number of tasks per project?"
          </div>
          <div className="cursor-pointer rounded-md bg-white p-3 shadow-sm hover:bg-indigo-50">
            "Generate a query to find incomplete tasks"
          </div>
          <div className="cursor-pointer rounded-md bg-white p-3 shadow-sm hover:bg-indigo-50">
            "Explain the relationship between users and tasks"
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
