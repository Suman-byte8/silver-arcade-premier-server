/**
 * Server Performance Monitoring Script
 * Monitors server resources and performance during load tests
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const CONFIG = {
  monitoringInterval: 5000, // 5 seconds
  logFile: path.join(__dirname, 'logs', 'server-monitoring.json'),
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  alerts: {
    cpuThreshold: 80, // Alert if CPU > 80%
    memoryThreshold: 85, // Alert if Memory > 85%
    diskThreshold: 90, // Alert if Disk > 90%
  }
};

// Ensure logs directory exists
const logsDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Monitoring data storage
class MonitoringData {
  constructor() {
    this.metrics = [];
    this.alerts = [];
    this.startTime = Date.now();
  }

  addMetric(metric) {
    this.metrics.push({
      timestamp: Date.now(),
      ...metric
    });

    // Keep only last 24 hours of data
    const cutoff = Date.now() - CONFIG.retentionPeriod;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  addAlert(alert) {
    this.alerts.push({
      timestamp: Date.now(),
      ...alert
    });

    console.warn(`🚨 ALERT: ${alert.message}`);
  }

  getStats() {
    if (this.metrics.length === 0) return null;

    const recent = this.metrics.slice(-10); // Last 10 measurements (50 seconds)

    return {
      current: this.metrics[this.metrics.length - 1],
      average: {
        cpu: recent.reduce((sum, m) => sum + m.cpu, 0) / recent.length,
        memory: recent.reduce((sum, m) => sum + m.memory, 0) / recent.length,
        disk: recent.reduce((sum, m) => sum + m.disk, 0) / recent.length
      },
      peak: {
        cpu: Math.max(...recent.map(m => m.cpu)),
        memory: Math.max(...recent.map(m => m.memory)),
        disk: Math.max(...recent.map(m => m.disk))
      },
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };
  }

  saveToFile() {
    const data = {
      startTime: this.startTime,
      endTime: Date.now(),
      metrics: this.metrics,
      alerts: this.alerts,
      summary: this.getStats()
    };

    fs.writeFileSync(CONFIG.logFile, JSON.stringify(data, null, 2));
  }
}

// System monitoring functions
class SystemMonitor {
  constructor() {
    this.data = new MonitoringData();
    this.isMonitoring = false;
    this.intervalId = null;
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      // Simple CPU usage approximation
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        const percentage = Math.min(100, (totalUsage / 0.1) * 100); // Based on 100ms sample
        resolve(Math.round(percentage * 100) / 100);
      }, 100);
    });
  }

  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.round((usedMemory / totalMemory) * 10000) / 100;
  }

  async getDiskUsage() {
    return new Promise((resolve) => {
      // Check disk usage of current directory
      exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
        if (error) {
          console.error('Error getting disk usage:', error);
          resolve(0);
          return;
        }

        try {
          const lines = stdout.split('\n').filter(line => line.trim());
          const header = lines[0];
          const data = lines[1];

          if (data) {
            const parts = data.trim().split(/\s+/);
            if (parts.length >= 3) {
              const total = parseInt(parts[1]);
              const free = parseInt(parts[2]);
              const used = total - free;
              const percentage = (used / total) * 100;
              resolve(Math.round(percentage * 100) / 100);
            }
          }
          resolve(0);
        } catch (err) {
          console.error('Error parsing disk usage:', err);
          resolve(0);
        }
      });
    });
  }

  async collectMetrics() {
    const [cpu, memory, disk] = await Promise.all([
      this.getCPUUsage(),
      this.getMemoryUsage(),
      this.getDiskUsage()
    ]);

    const metric = {
      cpu,
      memory,
      disk,
      timestamp: Date.now(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        uptime: os.uptime()
      }
    };

    this.data.addMetric(metric);

    // Check for alerts
    if (cpu > CONFIG.alerts.cpuThreshold) {
      this.data.addAlert({
        type: 'cpu',
        level: 'warning',
        message: `High CPU usage: ${cpu.toFixed(1)}% (threshold: ${CONFIG.alerts.cpuThreshold}%)`,
        value: cpu
      });
    }

    if (memory > CONFIG.alerts.memoryThreshold) {
      this.data.addAlert({
        type: 'memory',
        level: 'warning',
        message: `High memory usage: ${memory.toFixed(1)}% (threshold: ${CONFIG.alerts.memoryThreshold}%)`,
        value: memory
      });
    }

    if (disk > CONFIG.alerts.diskThreshold) {
      this.data.addAlert({
        type: 'disk',
        level: 'warning',
        message: `High disk usage: ${disk.toFixed(1)}% (threshold: ${CONFIG.alerts.diskThreshold}%)`,
        value: disk
      });
    }

    return metric;
  }

  startMonitoring() {
    if (this.isMonitoring) {
      console.log('📊 Monitoring already running');
      return;
    }

    console.log('🚀 Starting server monitoring...');
    this.isMonitoring = true;

    // Initial collection
    this.collectMetrics();

    // Set up interval monitoring
    this.intervalId = setInterval(async () => {
      try {
        const metric = await this.collectMetrics();
        console.log(`📊 CPU: ${metric.cpu.toFixed(1)}% | Memory: ${metric.memory.toFixed(1)}% | Disk: ${metric.disk.toFixed(1)}%`);
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, CONFIG.monitoringInterval);
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('📊 Monitoring not running');
      return;
    }

    console.log('🛑 Stopping server monitoring...');
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Save final data
    this.data.saveToFile();

    const stats = this.data.getStats();
    if (stats) {
      console.log('\n📈 Monitoring Summary:');
      console.log('====================');
      console.log(`Average CPU: ${stats.average.cpu.toFixed(1)}%`);
      console.log(`Average Memory: ${stats.average.memory.toFixed(1)}%`);
      console.log(`Average Disk: ${stats.average.disk.toFixed(1)}%`);
      console.log(`Peak CPU: ${stats.peak.cpu.toFixed(1)}%`);
      console.log(`Peak Memory: ${stats.peak.memory.toFixed(1)}%`);
      console.log(`Peak Disk: ${stats.peak.disk.toFixed(1)}%`);
      console.log(`Alerts triggered: ${stats.alerts.length}`);
      console.log(`Data saved to: ${CONFIG.logFile}`);
    }
  }

  getCurrentStats() {
    return this.data.getStats();
  }

  getMetrics() {
    return this.data.metrics;
  }

  getAlerts() {
    return this.data.alerts;
  }
}

// API endpoints for the monitoring system
class MonitoringAPI {
  constructor(monitor) {
    this.monitor = monitor;
  }

  getStats(req, res) {
    const stats = this.monitor.getCurrentStats();
    if (!stats) {
      return res.status(404).json({ error: 'No monitoring data available' });
    }
    res.json(stats);
  }

  getMetrics(req, res) {
    const metrics = this.monitor.getMetrics();
    res.json(metrics);
  }

  getAlerts(req, res) {
    const alerts = this.monitor.getAlerts();
    res.json(alerts);
  }

  startMonitoring(req, res) {
    this.monitor.startMonitoring();
    res.json({ status: 'started', message: 'Server monitoring started' });
  }

  stopMonitoring(req, res) {
    this.monitor.stopMonitoring();
    res.json({ status: 'stopped', message: 'Server monitoring stopped' });
  }
}

// Export for use in other modules
const monitor = new SystemMonitor();
const api = new MonitoringAPI(monitor);

module.exports = {
  SystemMonitor,
  MonitoringAPI,
  monitor,
  api
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      monitor.startMonitoring();

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n⏹️  Received SIGINT, stopping monitoring...');
        monitor.stopMonitoring();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\n⏹️  Received SIGTERM, stopping monitoring...');
        monitor.stopMonitoring();
        process.exit(0);
      });

      // Keep the process running
      setInterval(() => {}, 1000);
      break;

    case 'stop':
      monitor.stopMonitoring();
      break;

    case 'stats':
      const stats = monitor.getCurrentStats();
      if (stats) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log('No monitoring data available');
      }
      break;

    default:
      console.log('Usage: node server-monitor.js <command>');
      console.log('Commands:');
      console.log('  start  - Start monitoring');
      console.log('  stop   - Stop monitoring');
      console.log('  stats  - Show current statistics');
      break;
  }
}
