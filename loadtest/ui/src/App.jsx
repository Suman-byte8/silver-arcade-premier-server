import React, { useState, useEffect } from 'react';
import { Play, Square, BarChart3, Settings, Zap, Users, Clock, AlertTriangle } from 'lucide-react';
import LoadTestDashboard from './components/LoadTestDashboard';
import TestConfiguration from './components/TestConfiguration';
import ResultsDisplay from './components/ResultsDisplay';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [testResults, setTestResults] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'configure', label: 'Configure', icon: Settings },
    { id: 'results', label: 'Results', icon: Zap }
  ];

  const handleStartTest = async (config) => {
    setIsTestRunning(true);
    setCurrentTest(config);

    try {
      const response = await fetch('/api/loadtest/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const results = await response.json();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTestRunning(false);
      setCurrentTest(null);
    }
  };

  const handleStopTest = async () => {
    try {
      await fetch('/api/loadtest/stop', { method: 'POST' });
      setIsTestRunning(false);
      setCurrentTest(null);
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Zap className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold">Load Testing Dashboard</h1>
          </div>

          {isTestRunning && (
            <div className="flex items-center space-x-2 text-red-400">
              <div className="animate-pulse h-2 w-2 bg-red-400 rounded-full"></div>
              <span className="text-sm">Test Running...</span>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'dashboard' && (
          <LoadTestDashboard
            isTestRunning={isTestRunning}
            currentTest={currentTest}
            onStartTest={handleStartTest}
            onStopTest={handleStopTest}
          />
        )}

        {activeTab === 'configure' && (
          <TestConfiguration
            onStartTest={handleStartTest}
            isTestRunning={isTestRunning}
          />
        )}

        {activeTab === 'results' && (
          <ResultsDisplay
            results={testResults}
            isTestRunning={isTestRunning}
          />
        )}
      </main>
    </div>
  );
}

export default App;
