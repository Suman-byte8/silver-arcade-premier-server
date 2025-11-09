import React, { useState, useEffect } from 'react';
import { Play, Square, Users, Clock, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const LoadTestDashboard = ({ isTestRunning, currentTest, onStartTest, onStopTest }) => {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    totalRequests: 0,
    responseTime: 0,
    errorRate: 0,
    throughput: 0
  });

  const [chartData, setChartData] = useState([]);

  // Simulate real-time metrics updates
  useEffect(() => {
    if (isTestRunning) {
      const interval = setInterval(() => {
        setMetrics(prev => ({
          activeUsers: Math.floor(Math.random() * 100) + 50,
          totalRequests: prev.totalRequests + Math.floor(Math.random() * 20) + 5,
          responseTime: Math.floor(Math.random() * 200) + 100,
          errorRate: Math.random() * 5,
          throughput: Math.floor(Math.random() * 50) + 20
        }));

        // Update chart data
        setChartData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString(),
            responseTime: Math.floor(Math.random() * 200) + 100,
            throughput: Math.floor(Math.random() * 50) + 20,
            errors: Math.floor(Math.random() * 5)
          }];
          return newData.slice(-20); // Keep last 20 data points
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isTestRunning]);

  const quickTests = [
    {
      name: 'Light Load',
      users: 10,
      duration: 60,
      description: 'Basic functionality test'
    },
    {
      name: 'Medium Load',
      users: 50,
      duration: 120,
      description: 'Moderate concurrent users'
    },
    {
      name: 'Heavy Load',
      users: 100,
      duration: 300,
      description: 'High concurrent load test'
    },
    {
      name: 'Stress Test',
      users: 200,
      duration: 180,
      description: 'Maximum capacity test'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-blue-400">{metrics.activeUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Requests</p>
              <p className="text-2xl font-bold text-green-400">{metrics.totalRequests.toLocaleString()}</p>
            </div>
            <Zap className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Response Time</p>
              <p className="text-2xl font-bold text-yellow-400">{metrics.responseTime}ms</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Error Rate</p>
              <p className="text-2xl font-bold text-red-400">{metrics.errorRate.toFixed(1)}%</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Quick Test Buttons */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Quick Load Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickTests.map((test) => (
            <button
              key={test.name}
              onClick={() => onStartTest({
                type: 'artillery',
                name: test.name,
                users: test.users,
                duration: test.duration
              })}
              disabled={isTestRunning}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 p-4 rounded-lg text-left transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{test.name}</h3>
                <Play className="h-4 w-4" />
              </div>
              <p className="text-sm text-gray-400 mb-2">{test.description}</p>
              <div className="text-xs text-gray-500">
                <div>{test.users} users</div>
                <div>{test.duration}s duration</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Charts */}
      {isTestRunning && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Response Time Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
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

          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Throughput & Errors</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
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
                <Bar dataKey="throughput" fill="#10B981" />
                <Bar dataKey="errors" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Current Test Status */}
      {currentTest && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Current Test: {currentTest.name}</h3>
            <button
              onClick={onStopTest}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Stop Test</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="ml-2 text-white">{currentTest.type}</span>
            </div>
            <div>
              <span className="text-gray-400">Users:</span>
              <span className="ml-2 text-white">{currentTest.users}</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>
              <span className="ml-2 text-white">{currentTest.duration}s</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="ml-2 text-green-400">Running</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadTestDashboard;
