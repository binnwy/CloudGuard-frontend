import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Globe, Clock, Activity } from 'lucide-react';

// --- API Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const DetailPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    attacks: 0,
    benign: 0,
    highConfidence: 0,
  });

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/detail/logs?limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const logs = data.logs || [];
      setLogs(logs);
      
      // Calculate stats
      const total = data.total || logs.length;
      const attacks = logs.filter(log => 
        log.attack_type && log.attack_type.toLowerCase() !== 'benign'
      ).length;
      const benign = total - attacks;
      const highConfidence = logs.filter(log => 
        (log.confidence || 0) > 0.7
      ).length;
      
      setStats({
        total,
        attacks,
        benign,
        highConfidence,
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Keep existing data on error to prevent UI flicker
      setIsLoading(false);
    }
  };

  // Set up real-time polling (every 5 seconds)
  useEffect(() => {
    fetchLogs();
    
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const getSeverityColor = (attackType, confidence) => {
    if (!attackType || attackType.toLowerCase() === 'benign') {
      return 'text-green-400';
    }
    const conf = confidence || 0;
    if (conf >= 0.8) return 'text-red-400';
    if (conf >= 0.5) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getSeverityBadge = (attackType, confidence) => {
    if (!attackType || attackType.toLowerCase() === 'benign') {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">BENIGN</span>;
    }
    const conf = confidence || 0;
    if (conf >= 0.8) {
      return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">HIGH</span>;
    }
    if (conf >= 0.5) {
      return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">MEDIUM</span>;
    }
    return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">LOW</span>;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-inter">
      <style>{`
        .recharts-cartesian-axis-line {
          stroke: #4b5563 !important;
        }
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: #374151 !important;
          stroke-dasharray: 3 3;
        }
      `}</style>

      {/* Header */}
      <header className="mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-white mb-2">Security Logs Detail</h1>
        <p className="text-gray-400">Real-time monitoring of all network activity and threats</p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-gray-400 mt-1">All recorded events</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Attacks Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{stats.attacks}</div>
            <p className="text-xs text-gray-400 mt-1">Threats identified</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Benign Traffic</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.benign}</div>
            <p className="text-xs text-gray-400 mt-1">Safe connections</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">High Confidence</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.highConfidence}</div>
            <p className="text-xs text-gray-400 mt-1">High-risk alerts</p>
          </CardContent>
        </Card>
      </section>

      {/* Logs Table */}
      <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Recent Activity Logs</CardTitle>
          <CardDescription className="text-gray-400">
            Live feed of network security events (updates every 5 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">No logs available</div>
            </div>
          ) : (
            <div className="rounded-md border border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800/50">
                    <TableHead className="text-gray-300 font-semibold">Timestamp</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Source IP</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Region</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Attack Type</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Severity</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Confidence</TableHead>
                    <TableHead className="text-gray-300 font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow 
                      key={index} 
                      className="border-gray-700 hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="text-gray-300">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-500" />
                          {formatDate(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-gray-500" />
                          {log.srcaddr || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{log.region || 'N/A'}</TableCell>
                      <TableCell className={getSeverityColor(log.attack_type, log.confidence)}>
                        {log.attack_type || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(log.attack_type, log.confidence)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.action === 'BLOCKED' 
                            ? 'bg-red-500/20 text-red-400' 
                            : log.action === 'ALLOWED'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {log.action || 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailPage;
