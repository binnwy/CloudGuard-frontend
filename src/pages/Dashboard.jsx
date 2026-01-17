import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import {
  Calendar, ChevronDown, Download, AlertTriangle, ArrowUp, ArrowDown, ArrowRight, TrendingUp, Cpu, MessageSquare, Send, X, Clock,
} from 'lucide-react';

// --- API Configuration ---
const API_BASE_URL = 'http://127.0.0.1:8000';

// Mock Chat History (now with stable ids)
const initialChatHistory = [
  { type: 'bot',
    text: ' Hi! I’m CloudGuard AI. Ask me about recent attacks, traffic, or security activity.'
  }  
];

// --- Custom Components ---

const Card = ({ children, className = '' }) => (
  <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-700 shadow-xl ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, change, icon: Icon, chartData, chartColor }) => {
  const isPositive = change > 0;
  const ChangeIcon = isPositive ? ArrowUp : ArrowDown;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <Card className="flex flex-col justify-between h-full hover:border-blue-500 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">{title}</h3>
        <Icon className="w-5 h-5 text-gray-500" />
      </div>

      <div className="flex items-end justify-between mb-4">
        <div className="text-4xl font-extrabold text-white">
          {value}
        </div>
        <div className="w-1/3 h-10 -mr-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.map(d => ({ value: d }))}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center text-sm">
        <span className={`flex items-center font-bold mr-2 ${changeColor}`}>
          <ChangeIcon className="w-4 h-4 mr-1" />
          {Math.abs(change)}%
        </span>
        <span className="text-gray-400">{subtext}</span>
      </div>
    </Card>
  );
};

// --- Chatbot Component ---
const Chatbot = ({ isChatOpen, toggleChat }) => {
  // ensure initial messages have ids and normalized types
  const ensureInit = initialChatHistory.map((m, i) => ({
    id: m.id ?? `init-${i}`,
    type: m.type === 'user' ? 'user' : 'bot',
    text: m.text ?? '',
  }));

  const [history, setHistory] = useState(ensureInit);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e) => {
    e?.preventDefault?.();

    const trimmed = input.trim();
    if (!trimmed) return;

    // add user message with a stable id
    const newUserMessage = { id: `u-${Date.now()}`, type: 'user', text: trimmed };
    setHistory(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) throw new Error(`Backend ${res.status}`);

      const data = await res.json();

      // always create a bot message with correct type
      const botText = (data?.answer ?? 'No reply from server').toString();
      const newBotMessage = { id: `b-${Date.now()}`, type: 'bot', text: botText };
      setHistory(prev => [...prev, newBotMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = { id: `err-${Date.now()}`, type: 'bot', text: 'Sorry, could not reach the backend.' };
      setHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // auto-scroll on new messages
  useEffect(() => {
    const chatBody = document.getElementById('chat-body');
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
  }, [history]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ${isChatOpen ? 'w-full max-w-sm h-3/5 max-h-[500px]' : 'w-14 h-14'}`}>
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 transform hover:scale-110"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {isChatOpen && (
        <div className="flex flex-col h-full bg-gray-900 border border-blue-600/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-blue-600/30">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-green-400" />
              CloudGuard AI Analyst
            </h3>
            <button onClick={toggleChat} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div id="chat-body" className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar">
            {history.map((msg) => {
              // defensive: treat anything not 'user' as 'bot'
              const type = msg.type === 'user' ? 'user' : 'bot';
              const justifyClass = type === 'user' ? 'justify-end' : 'justify-start';
              const bubbleClass = type === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-700 text-gray-200 rounded-tl-none border border-gray-600';

              return (
                <div key={msg.id} className={`flex ${justifyClass}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-xl shadow-md text-sm whitespace-pre-wrap leading-relaxed ${bubbleClass}`}
                  >
                    {String(msg.text).split(/(\*\*.*?\*\*)/).map((part, i) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={i} className="text-blue-300 font-bold">{part.slice(2, -2)}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-xl shadow-md text-sm bg-gray-700 text-gray-200 rounded-tl-none italic">
                  CloudGuard AI is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for reports or analysis..."
                className="flex-grow p-3 mr-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                disabled={isLoading}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Dashboard Component ---

const Dashboard = () => {
  const [startDate, setStartDate] = useState('19-09-2025');
  const [endDate, setEndDate] = useState('26-09-2025');
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // State for real-time data
  const [stats, setStats] = useState([
    {
      title: "Total Attacks",
      value: "0",
      subtext: "Loading...",
      change: 0,
      icon: TrendingUp,
      color: "text-red-500",
      fill: "fill-red-500",
      chartData: [0, 0, 0, 0, 0, 0, 0],
      chartColor: "#ef4444",
    },
    {
      title: "Active Threats",
      value: "0%",
      subtext: "Loading...",
      change: 0,
      icon: AlertTriangle,
      color: "text-yellow-500",
      fill: "fill-yellow-500",
      chartData: [0, 0, 0, 0, 0, 0, 0],
      chartColor: "#f59e0b",
    },
    {
      title: "Active Alerts",
      value: "0%",
      subtext: "Loading...",
      change: 0,
      icon: AlertTriangle,
      color: "text-blue-400",
      fill: "fill-blue-400",
      chartData: [0, 0, 0, 0, 0, 0, 0],
      chartColor: "#60a5fa",
    },
    {
      title: "Uptime %",
      value: "100%",
      subtext: "Loading...",
      change: 0,
      icon: Cpu,
      color: "text-green-500",
      fill: "fill-green-500",
      chartData: [100, 100, 100, 100, 100, 100, 100],
      chartColor: "#10b981",
    },
  ]);
  
  const [timelineData, setTimelineData] = useState([]);
  const [threatSourceData, setThreatSourceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timelineRange, setTimelineRange] = useState('24h'); // Default to 24 hours

  const toggleChat = () => setIsChatOpen(prev => !prev);

  // Timeline range options
  const timelineRanges = [
    { value: '6h', label: 'Last 6 Hours', hours: 6, interval: 'hour' },
    { value: '24h', label: 'Last 24 Hours', hours: 24, interval: 'hour' },
    { value: '7d', label: 'Last 7 Days', hours: 168, interval: 'day' },
    { value: '30d', label: 'Last 30 Days', hours: 720, interval: 'day' },
  ];

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    try {
      // Get selected timeline range
      const selectedRange = timelineRanges.find(r => r.value === timelineRange) || timelineRanges[1];
      
      // Fetch stats and chart data in parallel
      const [statsRes, chartDataRes, timelineRes, threatRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/dashboard/stats`),
        fetch(`${API_BASE_URL}/api/dashboard/stats/chart-data`),
        fetch(`${API_BASE_URL}/api/dashboard/timeline?hours=${selectedRange.hours}&interval=${selectedRange.interval}`),
        fetch(`${API_BASE_URL}/api/dashboard/threat-sources`),
      ]);

      const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok 
        ? await statsRes.value.json() 
        : { total_attacks: 0, active_threats: 0, active_alerts: 0, uptime: 100, total_attacks_change: 0 };
      
      const chartData = chartDataRes.status === 'fulfilled' && chartDataRes.value.ok
        ? await chartDataRes.value.json()
        : { total_attacks: [0, 0, 0, 0, 0, 0, 0], active_threats: [0, 0, 0, 0, 0, 0, 0], active_alerts: [0, 0, 0, 0, 0, 0, 0], uptime: [100, 100, 100, 100, 100, 100, 100] };
      
      const timelineDataRes = timelineRes.status === 'fulfilled' && timelineRes.value.ok
        ? await timelineRes.value.json()
        : [];
      
      const threatData = threatRes.status === 'fulfilled' && threatRes.value.ok
        ? await threatRes.value.json()
        : [];

      // Update stats with real data
      setStats([
        {
          title: "Total Attacks",
          value: statsData.total_attacks >= 1000 ? `${(statsData.total_attacks / 1000).toFixed(1)}K` : statsData.total_attacks.toString(),
          subtext: statsData.total_attacks > 0 ? "Threats Detected" : "All Systems Operational",
          change: statsData.total_attacks_change || 0,
          icon: TrendingUp,
          color: "text-red-500",
          fill: "fill-red-500",
          chartData: chartData.total_attacks || [0, 0, 0, 0, 0, 0, 0],
          chartColor: "#ef4444",
        },
        {
          title: "Active Threats",
          value: `${statsData.active_threats}%`,
          subtext: statsData.active_threats > 50 ? "High Threat Level" : "Normal Activity",
          change: statsData.active_threats_change || 0,
          icon: AlertTriangle,
          color: "text-yellow-500",
          fill: "fill-yellow-500",
          chartData: chartData.active_threats || [0, 0, 0, 0, 0, 0, 0],
          chartColor: "#f59e0b",
        },
        {
          title: "Active Alerts",
          value: `${statsData.active_alerts}%`,
          subtext: statsData.active_alerts > 30 ? "Multiple Alerts" : "Low Alert Level",
          change: statsData.active_alerts_change || 0,
          icon: AlertTriangle,
          color: "text-blue-400",
          fill: "fill-blue-400",
          chartData: chartData.active_alerts || [0, 0, 0, 0, 0, 0, 0],
          chartColor: "#60a5fa",
        },
        {
          title: "Uptime %",
          value: `${statsData.uptime}%`,
          subtext: statsData.uptime > 90 ? "Excellent Performance" : "Needs Attention",
          change: statsData.uptime_change || 0,
          icon: Cpu,
          color: "text-green-500",
          fill: "fill-green-500",
          chartData: chartData.uptime || [100, 100, 100, 100, 100, 100, 100],
          chartColor: "#10b981",
        },
      ]);

      // Always set timeline data (backend should return data even if empty)
      if (timelineDataRes && Array.isArray(timelineDataRes) && timelineDataRes.length > 0) {
        setTimelineData(timelineDataRes);
        console.log('Timeline data loaded:', timelineDataRes.length, 'periods');
      } else {
        // Fallback: create empty timeline based on selected range
        const selectedRange = timelineRanges.find(r => r.value === timelineRange) || timelineRanges[1];
        let emptyTimeline = [];
        
        if (selectedRange.interval === 'day') {
          const numDays = selectedRange.hours / 24;
          emptyTimeline = Array.from({ length: numDays }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (numDays - 1 - i));
            return {
              time: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`,
              HIGH_SEVERITY: 0,
              MEDIUM_SEVERITY: 0,
              LOW_SEVERITY: 0
            };
          });
        } else {
          const numHours = Math.min(selectedRange.hours, 24);
          emptyTimeline = Array.from({ length: numHours }, (_, i) => {
            const hour = new Date();
            hour.setHours(hour.getHours() - (numHours - 1 - i));
            return {
              time: `${hour.getHours().toString().padStart(2, '0')}:00`,
              HIGH_SEVERITY: 0,
              MEDIUM_SEVERITY: 0,
              LOW_SEVERITY: 0
            };
          });
        }
        
        setTimelineData(emptyTimeline);
        console.log('Using empty timeline fallback');
      }
      
      setThreatSourceData(threatData.length > 0 ? threatData : []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep existing data on error to prevent UI flicker
      setIsLoading(false);
    }
  };

  // Set up real-time polling (every 5 seconds)
  useEffect(() => {
    fetchDashboardData(); // Initial fetch
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [timelineRange]); // Re-fetch when timeline range changes

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-inter">
      {/* Custom Styles for Glow and Grid Pattern */}
      <style>{`
        .ai-summary-bar {
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.7) 100%);
          backdrop-filter: blur(5px);
          border-top: 1px solid rgba(34, 197, 94, 0.3);
        }
        .ai-summary-bar::before {
          content: '';
          position: absolute;
          top: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, rgba(34, 197, 94, 0) 0%, rgba(34, 197, 94, 0.5) 50%, rgba(34, 197, 94, 0) 100%);
        }
        .recharts-cartesian-axis-line {
            stroke: #4b5563 !important;
        }
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
            stroke: #374151 !important;
            stroke-dasharray: 3 3;
        }
        .recharts-default-tooltip {
            background-color: #1f2937!important;
            border: 1px solid #4b5563!important;
            border-radius: 0.5rem;
            color: white!important;
            padding: 0.5rem!important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3b82f6;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
        }
      `}</style>

      {/* --- Top Header and Controls --- */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">CloudGuard Dashboard</h1>
        <div className="flex flex-wrap items-center space-x-2 sm:space-x-4">
          
          {/* Date Picker Group */}
          <div className="flex items-center bg-gray-800/70 p-2 rounded-xl text-sm border border-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span className="mr-1 text-gray-300">FROM</span>
            <span className="font-semibold text-white">{startDate}</span>
            <ArrowRight className="w-3 h-3 mx-2 text-gray-400" />
            <span className="mr-1 text-gray-300">TO</span>
            <span className="font-semibold text-white">{endDate}</span>
            <ChevronDown className="w-4 h-4 ml-2 text-gray-400 cursor-pointer" />
          </div>

          {/* Generate PDF Button */}
          <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-500/30">
            <Download className="w-4 h-4 mr-2" />
            Generate PDF
          </button>
        </div>
      </header>

      {/* --- Stat Cards (Grid) --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} chartData={stat.chartData.map((d, i) => ({ name: i, value: d }))} />
        ))}
      </section>

      {/* --- Main Charts Section (Flex/Grid) --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">

        {/* 1. Attack Timeline - Line Chart */}
        <Card className="h-[450px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Attack Timeline</h2>
            <div className="relative">
              <select
                value={timelineRange}
                onChange={(e) => setTimelineRange(e.target.value)}
                className="appearance-none bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-2 pr-8 text-white text-sm cursor-pointer hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timelineRanges.map((range) => (
                  <option key={range.value} value={range.value} className="bg-gray-800">
                    {range.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex justify-center space-x-4 text-xs mb-4">
            <span className="flex items-center text-red-400"><div className="w-3 h-3 mr-1 rounded-full bg-red-400"></div>HIGH SEVERITY</span>
            <span className="flex items-center text-yellow-400"><div className="w-3 h-3 mr-1 rounded-full bg-yellow-400"></div>MEDIUM SEVERITY</span>
            <span className="flex items-center text-green-400"><div className="w-3 h-3 mr-1 rounded-full bg-green-400"></div>LOW SEVERITY</span>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            {timelineData.length > 0 ? (
              <LineChart
                data={timelineData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 10 }} 
                  interval={timelineRange === '7d' || timelineRange === '30d' ? 'preserveStartEnd' : 2}
                  angle={timelineRange === '7d' || timelineRange === '30d' ? -45 : 0}
                  textAnchor={timelineRange === '7d' || timelineRange === '30d' ? 'end' : 'middle'}
                  height={timelineRange === '7d' || timelineRange === '30d' ? 60 : 30}
                />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#ffffff' }}
                />
                <Line type="monotone" dataKey="HIGH_SEVERITY" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="MEDIUM_SEVERITY" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="LOW_SEVERITY" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {isLoading ? 'Loading timeline data...' : (
                  <div className="text-center">
                    <div>No timeline data available</div>
                    <div className="text-xs mt-2 text-gray-500">Check backend connection and database</div>
                  </div>
                )}
              </div>
            )}
          </ResponsiveContainer>
        </Card>

        {/* 2. Top Threat Sources - Bar Chart */}
        <Card className="h-[450px]">
          <h2 className="text-xl font-bold mb-6">Top Threat Sources</h2>
          <ResponsiveContainer width="100%" height="90%">
            {threatSourceData.length > 0 ? (
              <BarChart
                data={threatSourceData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="threats" radius={[4, 4, 0, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 10 }}>
                  {threatSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {isLoading ? 'Loading threat sources...' : 'No threat sources detected'}
              </div>
            )}
          </ResponsiveContainer>
        </Card>
      </section>

      {/* --- AI Chatbot Interface (Fixed) --- */}
      <Chatbot isChatOpen={isChatOpen} toggleChat={toggleChat} />
    </div>
  );
};

export default Dashboard;
