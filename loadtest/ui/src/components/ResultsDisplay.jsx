import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const ResultsDisplay = ({ results, isTestRunning }) => {
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Mock data for demonstration - in real app, this would come from the API
  const mockResults = {
    summary: {
      totalRequests: 15420,
      successfulRequests: 15234,
      failedRequests: 186,
      successRate: '98.8%',
      testDuration: '300000ms',
      requestsPerSecond: '51.4',
      averageResponseTime: '245ms',
      minResponseTime: '45ms',
      maxResponseTime: '1250ms',
      p95ResponseTime: '450ms',
      p99ResponseTime: '780ms',
      totalErrors: 186
    },
    scenarios: [
      { name: 'User Registration', requests: 3084, successRate: '99.2%', avgTime: '320ms' },
      { name: 'User Login', requests: 4626, successRate: '98.5%', avgTime: '180ms' },
      { name: 'Accommodation Booking', requests: 3855, successRate: '98.9%', avgTime: '450ms' },
      { name: 'Restaurant Reservation', requests: 2313, successRate: '99.1%', avgTime: '290ms' },
      { name: 'Meeting Reservation', requests: 1542, successRate: '97.8%', avgTime: '520ms' }
    ],
    timeSeries: Array.from({ length: 30 }, (_, i) => ({
      time: `${i * 10}s`,
      responseTime: Math.floor(Math.random() * 200) + 200,
      throughput: Math.floor(Math.random() * 20) + 40,
      errors: Math.floor(Math.random() * 3)
    })),
    errors: [
      { type: 'Timeout', count: 89, percentage: '47.8%' },
      { type: 'Server Error', count: 67, percentage: '36.0%' },
      { type: 'Validation Error', count: 30, percentage: '16.2%' }
    ]
  };

  const displayResults = results || mockResults;

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (value, thresholds) => {
    if (value >= thresholds.good) return '✅';
    if (value >= thresholds.warning) return '⚠️';
    return '❌';
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(displayResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `loadtest-results-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isTestRunning) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Test in Progress</h3>
          <p className="text-gray-400">Results will be available once the test completes</p>
        </div>
      </div>
    );
  }

  if (!displayResults) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Results Available</h3>
          <p className="text-gray-400">Run a load test to see results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Results</h2>
        <button
          onClick={exportResults}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Export Results</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className={`text-2xl font-bold ${getStatusColor(parseFloat(displayResults.summary.successRate), { good: 99, warning: 95 })}`}>
                {displayResults.summary.successRate}
              </p>
            </div>
            <div className="text-2xl">
              {getStatusIcon(parseFloat(displayResults.summary.successRate), { good: 99, warning: 95 })}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Requests/sec</p>
              <p className="text-2xl font-bold text-blue-400">{displayResults.summary.requestsPerSecond}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Response Time</p>
              <p className={`text-2xl font-bold ${getStatusColor(parseInt(displayResults.summary.averageResponseTime), { good: 200, warning: 500 })}`}>
                {displayResults.summary.averageResponseTime}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Errors</p>
              <p className={`text-2xl font-bold ${getStatusColor(displayResults.summary.totalErrors, { good: 0, warning: 50 })}`}>
                {displayResults.summary.totalErrors}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Response Time Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayResults.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Throughput Chart */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Throughput & Errors</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayResults.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="throughput" fill="#10B981" name="Throughput" />
              <Bar dataKey="errors" fill="#EF4444" name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario Breakdown */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Scenario Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2">Scenario</th>
                <th className="text-right py-2">Requests</th>
                <th className="text-right py-2">Success Rate</th>
                <th className="text-right py-2">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.scenarios.map((scenario, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2">{scenario.name}</td>
                  <td className="text-right py-2">{scenario.requests.toLocaleString()}</td>
                  <td className={`text-right py-2 ${getStatusColor(parseFloat(scenario.successRate), { good: 99, warning: 95 })}`}>
                    {scenario.successRate}
                  </td>
                  <td className={`text-right py-2 ${getStatusColor(parseInt(scenario.avgTime), { good: 300, warning: 600 })}`}>
                    {scenario.avgTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Analysis */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Error Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-semibold mb-3">Error Types</h4>
            <div className="space-y-2">
              {displayResults.errors.map((error, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-400">{error.type}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400">{error.count}</span>
                    <span className="text-gray-500">({error.percentage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-3">Performance Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">P95 Response Time:</span>
                <span className={getStatusColor(parseInt(displayResults.summary.p95ResponseTime), { good: 500, warning: 800 })}>
                  {displayResults.summary.p95ResponseTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">P99 Response Time:</span>
                <span className={getStatusColor(parseInt(displayResults.summary.p99ResponseTime), { good: 800, warning: 1200 })}>
                  {displayResults.summary.p99ResponseTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Min Response Time:</span>
                <span className="text-green-400">{displayResults.summary.minResponseTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Response Time:</span>
                <span className="text-red-400">{displayResults.summary.maxResponseTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;
