import React, { useState } from 'react';
import { Play, Settings, Code, Users, Clock, Zap } from 'lucide-react';

const TestConfiguration = ({ onStartTest, isTestRunning }) => {
  const [config, setConfig] = useState({
    type: 'artillery',
    name: 'Custom Load Test',
    users: 50,
    duration: 120,
    rampUp: 30,
    baseUrl: 'http://localhost:5000',
    scenarios: {
      registration: 20,
      login: 30,
      accommodation: 25,
      restaurant: 15,
      meeting: 10
    }
  });

  const testTypes = [
    {
      id: 'artillery',
      name: 'Artillery',
      description: 'YAML-based load testing with detailed scenarios',
      icon: Code
    },
    {
      id: 'k6',
      name: 'K6',
      description: 'JavaScript-based load testing with advanced metrics',
      icon: Zap
    },
    {
      id: 'concurrent',
      name: 'Concurrent Node.js',
      description: 'Custom Node.js concurrent user simulation',
      icon: Users
    }
  ];

  const handleStartTest = () => {
    onStartTest(config);
  };

  const updateScenario = (scenario, value) => {
    const total = Object.values(config.scenarios).reduce((sum, val) => sum + val, 0) - config.scenarios[scenario] + value;
    if (total <= 100) {
      setConfig(prev => ({
        ...prev,
        scenarios: {
          ...prev.scenarios,
          [scenario]: value
        }
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Type Selection */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Test Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setConfig(prev => ({ ...prev, type: type.id }))}
                className={`p-4 rounded-lg text-left transition-colors ${
                  config.type === type.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Icon className="h-8 w-8 mb-2" />
                <h3 className="font-semibold mb-1">{type.name}</h3>
                <p className="text-sm opacity-80">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Basic Configuration */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Basic Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Test Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Concurrent Users
            </label>
            <input
              type="number"
              value={config.users}
              onChange={(e) => setConfig(prev => ({ ...prev, users: parseInt(e.target.value) }))}
              min="1"
              max="1000"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={config.duration}
              onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              min="10"
              max="3600"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Ramp Up (seconds)
            </label>
            <input
              type="number"
              value={config.rampUp}
              onChange={(e) => setConfig(prev => ({ ...prev, rampUp: parseInt(e.target.value) }))}
              min="0"
              max="300"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Base URL
          </label>
          <input
            type="url"
            value={config.baseUrl}
            onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Scenario Distribution */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Scenario Distribution (%)</h2>
        <div className="space-y-4">
          {Object.entries(config.scenarios).map(([scenario, percentage]) => (
            <div key={scenario} className="flex items-center space-x-4">
              <label className="w-32 text-sm font-medium text-gray-400 capitalize">
                {scenario}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => updateScenario(scenario, parseInt(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => updateScenario(scenario, parseInt(e.target.value))}
                className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
              />
              <span className="w-8 text-sm text-gray-400">%</span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total:</span>
            <span className={`font-semibold ${
              Object.values(config.scenarios).reduce((a, b) => a + b, 0) === 100
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {Object.values(config.scenarios).reduce((a, b) => a + b, 0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Advanced Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.enableMonitoring || false}
                onChange={(e) => setConfig(prev => ({ ...prev, enableMonitoring: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Enable server monitoring</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.saveResults || true}
                onChange={(e) => setConfig(prev => ({ ...prev, saveResults: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Save detailed results</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.enableAlerts || false}
                onChange={(e) => setConfig(prev => ({ ...prev, enableAlerts: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Enable performance alerts</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.generateReport || true}
                onChange={(e) => setConfig(prev => ({ ...prev, generateReport: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Generate HTML report</span>
            </label>
          </div>
        </div>
      </div>

      {/* Start Test Button */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Ready to Start Test</h3>
            <p className="text-gray-400 text-sm mt-1">
              {config.users} users for {config.duration} seconds using {config.type}
            </p>
          </div>

          <button
            onClick={handleStartTest}
            disabled={isTestRunning || Object.values(config.scenarios).reduce((a, b) => a + b, 0) !== 100}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg flex items-center space-x-2 font-semibold"
          >
            <Play className="h-5 w-5" />
            <span>Start Load Test</span>
          </button>
        </div>

        {Object.values(config.scenarios).reduce((a, b) => a + b, 0) !== 100 && (
          <p className="text-red-400 text-sm mt-2">
            Scenario distribution must total 100%
          </p>
        )}
      </div>
    </div>
  );
};

export default TestConfiguration;
