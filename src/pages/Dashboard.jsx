import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  Calendar, ChevronDown, Download, AlertTriangle, ArrowUp, ArrowDown, ArrowRight, TrendingUp, Cpu, MessageSquare, Send, X,
} from 'lucide-react';

// --- Mock Data ---

const mockStats = [
  {
    title: "Total Attacks",
    value: "10.4K",
    subtext: "All Systems Operational",
    change: 12.5,
    icon: TrendingUp,
    color: "text-red-500",
    fill: "fill-red-500",
    chartData: [2, 5, 4, 6, 8, 5, 7],
    chartColor: "#ef4444",
  },
  {
    title: "Active Threats",
    value: "82%",
    subtext: "10% Data Un-tested",
    change: -5.0,
    icon: AlertTriangle,
    color: "text-yellow-500",
    fill: "fill-yellow-500",
    chartData: [8, 6, 7, 5, 9, 7, 4],
    chartColor: "#f59e0b",
  },
  {
    title: "Active Alerts",
    value: "41%",
    subtext: "17% Data Un-tested",
    change: 8.0,
    icon: AlertTriangle,
    color: "text-blue-400",
    fill: "fill-blue-400",
    chartData: [5, 7, 6, 8, 4, 7, 9],
    chartColor: "#60a5fa",
  },
  {
    title: "Uptime %",
    value: "68%",
    subtext: "10% Improvement",
    change: 10.0,
    icon: Cpu,
    color: "text-green-500",
    fill: "fill-green-500",
    chartData: [4, 7, 8, 6, 9, 8, 7],
    chartColor: "#10b981",
  },
];

const mockTimelineData = [
  { time: '00:00', HIGH_SEVERITY: 5, MEDIUM_SEVERITY: 10, LOW_SEVERITY: 15 },
  { time: '02:00', HIGH_SEVERITY: 10, MEDIUM_SEVERITY: 8, LOW_SEVERITY: 12 },
  { time: '04:00', HIGH_SEVERITY: 15, MEDIUM_SEVERITY: 12, LOW_SEVERITY: 8 },
  { time: '06:00', HIGH_SEVERITY: 20, MEDIUM_SEVERITY: 15, LOW_SEVERITY: 10 },
  { time: '08:00', HIGH_SEVERITY: 18, MEDIUM_SEVERITY: 14, LOW_SEVERITY: 9 },
  { time: '10:00', HIGH_SEVERITY: 25, MEDIUM_SEVERITY: 20, LOW_SEVERITY: 15 },
  { time: '12:00', HIGH_SEVERITY: 30, MEDIUM_SEVERITY: 22, LOW_SEVERITY: 18 },
  { time: '14:00', HIGH_SEVERITY: 28, MEDIUM_SEVERITY: 20, LOW_SEVERITY: 16 },
  { time: '16:00', HIGH_SEVERITY: 22, MEDIUM_SEVERITY: 15, LOW_SEVERITY: 12 },
  { time: '18:00', HIGH_SEVERITY: 15, MEDIUM_SEVERITY: 10, LOW_SEVERITY: 8 },
  { time: '20:00', HIGH_SEVERITY: 10, MEDIUM_SEVERITY: 5, LOW_SEVERITY: 4 },
  { time: '22:00', HIGH_SEVERITY: 5, MEDIUM_SEVERITY: 3, LOW_SEVERITY: 2 },
  { time: '24:00', HIGH_SEVERITY: 1, MEDIUM_SEVERITY: 1, LOW_SEVERITY: 1 },
];

const mockThreatSourceData = [
  { name: 'DDOS', threats: 40, color: '#ef4444' },
  { name: 'SRUL FORCE', threats: 35, color: '#f59e0b' },
  { name: '101.0.9.41', threats: 30, color: '#60a5fa' },
  { name: '1.0.0.5', threats: 28, color: '#10b981' },
  { name: '1.2.0.0.45', threats: 25, color: '#a855f7' },
];

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

  const toggleChat = () => setIsChatOpen(prev => !prev);

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
        {mockStats.map((stat, index) => (
          <StatCard key={index} {...stat} chartData={stat.chartData.map((d, i) => ({ name: i, value: d }))} />
        ))}
      </section>

      {/* --- Main Charts Section (Flex/Grid) --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">

        {/* 1. Attack Timeline (24h) - Line Chart */}
        <Card className="h-[450px]">
          <h2 className="text-xl font-bold mb-6">Attack Timeline (24h)</h2>
          <div className="flex justify-center space-x-4 text-xs mb-4">
            <span className="flex items-center text-red-400"><div className="w-3 h-3 mr-1 rounded-full bg-red-400"></div>HIGH SEVERITY</span>
            <span className="flex items-center text-yellow-400"><div className="w-3 h-3 mr-1 rounded-full bg-yellow-400"></div>MEDIUM SEVERITY</span>
            <span className="flex items-center text-green-400"><div className="w-3 h-3 mr-1 rounded-full bg-green-400"></div>LOW SEVERITY</span>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart
              data={mockTimelineData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 10 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} domain={[0, 45]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Line type="monotone" dataKey="HIGH_SEVERITY" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="MEDIUM_SEVERITY" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="LOW_SEVERITY" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 2. Top Threat Sources - Bar Chart */}
        <Card className="h-[450px]">
          <h2 className="text-xl font-bold mb-6">Top Threat Sources</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={mockThreatSourceData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} domain={[0, 45]} />
              <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Bar dataKey="threats" fill="#3b82f6" radius={[4, 4, 0, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 10 }}>
                {
                    mockThreatSourceData.map((entry, index) => (
                        <Bar key={`bar-${index}`} fill={entry.color} />
                    ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* --- AI Chatbot Interface (Fixed) --- */}
      <Chatbot isChatOpen={isChatOpen} toggleChat={toggleChat} />
    </div>
  );
};

export default Dashboard;
