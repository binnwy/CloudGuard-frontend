import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import {
  Calendar, ChevronDown, Download, AlertTriangle, ArrowRight, TrendingUp, Cpu, MessageSquare, Send, X, Clock, Database, Percent, Shield,
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

      <div className="text-sm text-gray-400">
        {subtext}
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
  
  // State for real-time data - 4 KPIs: Total Logs, Total Attacks Detected, Attack % of Traffic, Most Common Attack Type
  const [stats, setStats] = useState([
    {
      title: "Total Logs",
      value: "0",
      subtext: "Loading...",
      change: 0,
      icon: Database,
      color: "text-blue-400",
      fill: "fill-blue-400",
      chartData: [0, 0, 0, 0, 0, 0, 0],
      chartColor: "#60a5fa",
    },
    {
      title: "Total Attacks Detected",
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
      title: "Attack % of Traffic",
      value: "0%",
      subtext: "Loading...",
      change: 0,
      icon: Percent,
      color: "text-yellow-500",
      fill: "fill-yellow-500",
      chartData: [0, 0, 0, 0, 0, 0, 0],
      chartColor: "#f59e0b",
    },
    {
      title: "Most Common Attack Type",
      value: "None",
      subtext: "Loading...",
      change: 0,
      icon: Shield,
      color: "text-green-500",
      fill: "fill-green-500",
      chartData: [0, 0, 0, 0, 0, 0, 0],
      chartColor: "#10b981",
    },
  ]);
  
  const [timelineData, setTimelineData] = useState([]);
  const [threatSourceData, setThreatSourceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date range selector state
  const [selectedRange, setSelectedRange] = useState('today');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // CSV column selection state
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const csvColumns = [
    'created_at', 'srcport', 'dstport', 'protocol', 'packets', 'bytes', 
    'start', 'end', 'tcp_flags', 'predicted_label', 'confidence', 'id', 
    'srcaddr', 'dstaddr', 'pkt_srcaddr', 'pkt_dstaddr', 'region', 
    'flow_direction', 'traffic_path', 'interface_id', 'log_status', 'action', 'attack_type'
  ];
  const [selectedColumns, setSelectedColumns] = useState(new Set(csvColumns));

  const toggleChat = () => setIsChatOpen(prev => !prev);

  // Date range options
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'custom', label: 'Custom Range...' },
  ];

  // Get label for currently selected range
  const getSelectedRangeLabel = () => {
    if (selectedRange === 'custom') return 'Custom Range';
    const option = dateRangeOptions.find(opt => opt.value === selectedRange);
    return option ? option.label : 'Today';
  };

  // Handle custom range apply
  const handleCustomRangeApply = () => {
    if (customFromDate && customToDate) {
      setSelectedRange('custom');
      setShowCustomModal(false);
      setDropdownOpen(false);
    }
  };

  // Handle custom range cancel
  const handleCustomRangeCancel = () => {
    setShowCustomModal(false);
    setCustomFromDate('');
    setCustomToDate('');
  };

  // Handle range selection from dropdown
  const handleRangeSelect = (rangeValue) => {
    if (rangeValue === 'custom') {
      setShowCustomModal(true);
      setDropdownOpen(false);
    } else {
      setSelectedRange(rangeValue);
      setDropdownOpen(false);
    }
  };

  // Handle column toggle
  const handleColumnToggle = (column) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  };

  // Handle "Select All" toggle
  const handleSelectAllColumns = (checked) => {
    if (checked) {
      setSelectedColumns(new Set(csvColumns));
    } else {
      setSelectedColumns(new Set());
    }
  };

  // Handle CSV export
  const handleExportCSV = () => {
    const { fromDateISO, toDateISO } = computedDateRange;
    const columnList = Array.from(selectedColumns).join(',');
    const url = `${API_BASE_URL}/api/dashboard/export-csv?from_date=${encodeURIComponent(fromDateISO)}&to_date=${encodeURIComponent(toDateISO)}&columns=${encodeURIComponent(columnList)}`;
    window.open(url, '_blank');
  };

  // Timeline range options
  const timelineRanges = [
    { value: '6h', label: 'Last 6 Hours', hours: 6, interval: 'hour' },
    { value: '24h', label: 'Last 24 Hours', hours: 24, interval: 'hour' },
    { value: '7d', label: 'Last 7 Days', hours: 168, interval: 'day' },
    { value: '30d', label: 'Last 30 Days', hours: 720, interval: 'day' },
  ];

  // Helper function to convert hours to ISO 8601 date range
  const getDateRangeFromHours = (hours) => {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - hours * 60 * 60 * 1000);
    
    // Format as ISO 8601 UTC
    const from = fromDate.toISOString();
    const to = toDate.toISOString();
    
    return { from_date: from, to_date: to };
  };

  // Helper function to determine interval based on selected date range
  // today, yesterday → use hourly aggregation
  // last7days, last30days → use daily aggregation
  // custom → determine based on date range size
  const getIntervalForDateRange = (range) => {
    switch (range) {
      case 'today':
      case 'yesterday':
        return 'hour';
      case 'last7days':
        return 'day';
      case 'custom': {
        // For custom ranges, use daily if span > 7 days, else hourly
        if (customFromDate && customToDate) {
          const [fromYear, fromMonth, fromDay] = customFromDate.split('-').map(Number);
          const [toYear, toMonth, toDay] = customToDate.split('-').map(Number);
          const fromDate = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
          const toDate = new Date(Date.UTC(toYear, toMonth - 1, toDay));
          const diffDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
          return diffDays > 7 ? 'day' : 'hour';
        }
        return 'hour';
      }
      default:
        return 'hour';
    }
  };

  // Compute from_date and to_date based on selected range
  /**
   * ROOT CAUSE FIX: Timezone Correction
   * 
   * CRITICAL BUG FIXED: The original implementation used local browser timezone 
   * to create dates, but Supabase stores all created_at timestamps in UTC.
   * This mismatch caused date range queries to miss all data.
   * 
   * Example of the bug:
   * - Browser local time: Jan 18 18:30:00 (EST, UTC-5)
   * - Converted to UTC by JS: Jan 19 23:30:00 (shifted forward!)
   * - Database data: Jan 15 14:55:57 UTC
   * - Query: "from Jan 19 23:30:00 UTC to now UTC"
   * - Result: 0 rows (date range is AFTER all data!)
   * 
   * FIX: Use Date.UTC() and getUTC*() methods exclusively to ensure all
   * dates are computed in UTC timezone, matching Supabase created_at field.
   */
  const computeDateRange = (range, customFromDate, customToDate) => {
    let fromDate, toDate;

    switch (range) {
      case 'today': {
        // Today in UTC: midnight UTC to now UTC
        const now = new Date();
        fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        toDate = now;
        break;
      }
      case 'yesterday': {
        // Yesterday in UTC: midnight UTC to 23:59:59 UTC
        const now = new Date();
        const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
        fromDate = yesterday;
        toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999));
        break;
      }
      case 'last7days': {
        // Now - 7 days UTC to now UTC
        const now = new Date();
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        toDate = now;
        break;
      }
      case 'last30days': {
        // Now - 30 days UTC to now UTC
        const now = new Date();
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        toDate = now;
        break;
      }
      case 'custom': {
        // Custom dates: parse as UTC, from at 00:00:00 to at 23:59:59 UTC
        if (customFromDate && customToDate) {
          // Parse date string (YYYY-MM-DD) as UTC
          const [fromYear, fromMonth, fromDay] = customFromDate.split('-').map(Number);
          const [toYear, toMonth, toDay] = customToDate.split('-').map(Number);
          
          fromDate = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0));
          toDate = new Date(Date.UTC(toYear, toMonth - 1, toDay, 23, 59, 59, 999));
        } else {
          // Fallback to today UTC if custom dates not set
          const now = new Date();
          fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
          toDate = now;
        }
        break;
      }
      default: {
        // Default to today UTC
        const now = new Date();
        fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        toDate = now;
      }
    }

    return {
      fromDateISO: fromDate.toISOString(),
      toDateISO: toDate.toISOString(),
    };
  };

  // Compute and store date range from selected range
  const [computedDateRange, setComputedDateRange] = useState(() =>
    computeDateRange('today', '', '')
  );

  // Update computed date range whenever selection or custom dates change
  useEffect(() => {
    const newRange = computeDateRange(selectedRange, customFromDate, customToDate);
    setComputedDateRange(newRange);
  }, [selectedRange, customFromDate, customToDate]);

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    try {
      // Get dates from computed range (defaults to today if missing)
      const fromDate = computedDateRange?.fromDateISO || computeDateRange('today', '', '').fromDateISO;
      const toDate = computedDateRange?.toDateISO || computeDateRange('today', '', '').toDateISO;
      
      // Determine interval based on selected date range (top dropdown)
      const interval = getIntervalForDateRange(selectedRange);
      
      // DEBUG: Log system time and date range
      const now = new Date();
      const todayDateString = now.toDateString(); // e.g., "Wed Mar 18 2026"
      const todayDateStringUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toDateString();
      
      console.log('\n🕐 [Dashboard] System Time & Date Range:');
      console.log(`   Local time: ${now.toString()}`);
      console.log(`   UTC time: ${now.toUTCString()}`);
      console.log(`   Today (local): ${todayDateString}`);
      console.log(`   Today (UTC): ${todayDateStringUTC}`);
      console.log(`   Timezone offset: ${now.getTimezoneOffset()} minutes`);
      console.log(`   Selected range: ${selectedRange}`);
      console.log(`   API from_date: ${fromDate}`);
      console.log(`   API to_date: ${toDate}`);
      console.log(`   Chart interval: ${interval}`);
      
      // Fetch stats and chart data in parallel
      const [statsRes, chartDataRes, timelineRes, threatRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/dashboard/stats?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`),
        fetch(`${API_BASE_URL}/api/dashboard/stats/chart-data?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`),
        fetch(`${API_BASE_URL}/api/dashboard/timeline?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}&interval=${interval}`),
        fetch(`${API_BASE_URL}/api/dashboard/threat-sources?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}&interval=${interval}`),
      ]);

      const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok 
        ? await statsRes.value.json() 
        : { total_logs: 0, total_attacks: 0, attack_percentage: 0, most_common_attack_type: "None", total_attacks_change: 0 };
      
      const chartData = chartDataRes.status === 'fulfilled' && chartDataRes.value.ok
        ? await chartDataRes.value.json()
        : { total_attacks: [0, 0, 0, 0, 0, 0, 0], active_threats: [0, 0, 0, 0, 0, 0, 0], active_alerts: [0, 0, 0, 0, 0, 0, 0], uptime: [100, 100, 100, 100, 100, 100, 100] };
      
      const timelineDataRes = timelineRes.status === 'fulfilled' && timelineRes.value.ok
        ? await timelineRes.value.json()
        : [];
      
      const threatData = threatRes.status === 'fulfilled' && threatRes.value.ok
        ? await threatRes.value.json()
        : [];
      
      // DEBUG: Log raw API responses
      console.log('\n📊 [Dashboard] Raw API Responses:');
      console.log(`   Stats - total_logs: ${statsData.total_logs}, total_attacks: ${statsData.total_attacks}`);
      console.log(`   Timeline - entries: ${timelineDataRes?.length || 0}`);
      if (timelineDataRes?.length > 0) {
        console.log(`   Timeline sample:`, timelineDataRes[0]);
        // Show date breakdown if we have timeline data
        const timeKeys = timelineDataRes.map(d => d.time);
        console.log(`   Timeline time keys: ${timeKeys.join(', ')}`);
      }
      console.log(`   Threats - entries: ${threatData?.length || 0}`);
      if (threatData?.length > 0) {
        console.log(`   Threats sample:`, threatData[0]);
      }

      // Update stats with real data - 4 KPIs in order: Total Logs, Total Attacks Detected, Attack % of Traffic, Most Common Attack Type
      setStats([
        {
          title: "Total Logs",
          value: statsData.total_logs >= 1000 ? `${(statsData.total_logs / 1000).toFixed(1)}K` : (statsData.total_logs || 0).toString(),
          subtext: "Derived from ingested traffic logs",
          change: 0,
          icon: Database,
          color: "text-blue-400",
          fill: "fill-blue-400",
          chartData: [0, 0, 0, 0, 0, 0, 0], // Chart data not needed for this KPI
          chartColor: "#60a5fa",
        },
        {
          title: "Total Attacks Detected",
          value: statsData.total_attacks >= 1000 ? `${(statsData.total_attacks / 1000).toFixed(1)}K` : (statsData.total_attacks || 0).toString(),
          subtext: "Derived from non-zero predicted labels",
          change: statsData.total_attacks_change || 0,
          icon: TrendingUp,
          color: "text-red-500",
          fill: "fill-red-500",
          chartData: chartData.total_attacks || [0, 0, 0, 0, 0, 0, 0],
          chartColor: "#ef4444",
        },
        {
          title: "Attack % of Traffic",
          value: `${(statsData.attack_percentage || 0).toFixed(2)}%`,
          subtext: "Derived from ML classification results",
          change: 0,
          icon: Percent,
          color: "text-yellow-500",
          fill: "fill-yellow-500",
          chartData: [0, 0, 0, 0, 0, 0, 0], // Chart data not needed for this KPI
          chartColor: "#f59e0b",
        },
        {
          title: "Most Common Attack Type",
          value: statsData.most_common_attack_type && statsData.most_common_attack_type !== "None" 
            ? statsData.most_common_attack_type.length > 12 
              ? statsData.most_common_attack_type.substring(0, 12) + "..."
              : statsData.most_common_attack_type
            : "None",
          subtext: "Derived from attack type frequency analysis",
          change: 0,
          icon: Shield,
          color: "text-green-500",
          fill: "fill-green-500",
          chartData: [0, 0, 0, 0, 0, 0, 0], // Chart data not needed for this KPI
          chartColor: "#10b981",
        },
      ]);

      // Always set timeline data (backend should return data even if empty)
      if (timelineDataRes && Array.isArray(timelineDataRes) && timelineDataRes.length > 0) {
        // Check if any buckets have non-zero data
        const hasData = timelineDataRes.some(d => d.HIGH_SEVERITY > 0 || d.MEDIUM_SEVERITY > 0 || d.LOW_SEVERITY > 0);
        
        if (hasData) {
          console.log("\n✅ [Timeline] Data with attacks received:", timelineDataRes.length, 'data points');
          console.log("📈 Sample row:", timelineDataRes[0]);
          console.log("🔍 All data keys:", Object.keys(timelineDataRes[0]));
          setTimelineData(timelineDataRes);
          console.log('✓ Timeline data loaded:', timelineDataRes.length, 'periods');
        } else {
          console.warn('\n⚠️ [Timeline] Received buckets but all have zero attacks');
          console.log('First bucket:', timelineDataRes[0]);
          console.log('Last bucket:', timelineDataRes[timelineDataRes.length - 1]);
          
          // If "Today" has no data but we got empty buckets, check if we should suggest expanding date range
          if (selectedRange === 'today') {
            console.warn('⚠️ No attacks detected for TODAY. Consider trying "Last 7 Days".');
          }
          
          setTimelineData(timelineDataRes); // Set the empty buckets so chart shows the full timeline
        }
      } else {
        // Fallback: create empty timeline based on selected date range
        const interval = getIntervalForDateRange(selectedRange);
        let emptyTimeline = [];
        
        console.warn('\n⚠️ [Timeline] No buckets received from backend for range:', selectedRange);
        
        if (interval === 'day') {
          // For daily intervals, generate empty days
          const fromDate = new Date(computedDateRange.fromDateISO);
          const toDate = new Date(computedDateRange.toDateISO);
          const numDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
          
          emptyTimeline = Array.from({ length: numDays }, (_, i) => {
            const date = new Date(fromDate);
            date.setDate(date.getDate() + i);
            return {
              time: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`,
              HIGH_SEVERITY: 0,
              MEDIUM_SEVERITY: 0,
              LOW_SEVERITY: 0
            };
          });
        } else {
          // For hourly intervals, generate empty hours
          const numHours = Math.min(24, 24);
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
        console.log('ℹ️ Using empty timeline fallback with', emptyTimeline.length, 'buckets');
      }
      
      // Handle threat source data
      if (threatData && Array.isArray(threatData) && threatData.length > 0) {
        console.log("\n✅ [Threats] Data received:", threatData.length, 'source IPs');
        console.log("📊 Sample threat:", threatData[0]);
        setThreatSourceData(threatData);
      } else {
        console.warn('\n⚠️ [Threats] No data received from backend');
        
        // Helpful message for "Today" with no threats
        if (selectedRange === 'today') {
          console.warn('ℹ️ No attack sources detected for TODAY. Try "Last 7 Days" for more data.');
        }
        
        setThreatSourceData([]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('\n❌ Error fetching dashboard data:', error);
      // Keep existing data on error to prevent UI flicker
      setIsLoading(false);
    }
  };

  
  useEffect(() => {
    fetchDashboardData(); 
  }, [computedDateRange, selectedRange]); 

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
          
          {/* Date Range Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center bg-gray-800/70 hover:bg-gray-800 p-3 rounded-xl text-sm border border-gray-700 text-white transition-colors duration-200"
            >
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span className="font-semibold">{getSelectedRangeLabel()}</span>
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-40 min-w-48">
                {dateRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRangeSelect(option.value)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors ${
                      selectedRange === option.value ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300'
                    } ${option.value === 'custom' && 'border-t border-gray-600'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate PDF Button */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-500/30"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate CSV
          </button>

          {/* Column Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center bg-gray-800/70 hover:bg-gray-800 p-2 rounded-xl text-sm border border-gray-700 text-white transition-colors duration-200"
              title="Select CSV columns"
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showColumnSelector && (
              <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-40 w-64 max-h-96 overflow-y-auto">
                {/* Select All Checkbox */}
                <div className="p-3 border-b border-gray-700 sticky top-0 bg-gray-800">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColumns.size === csvColumns.length}
                      onChange={(e) => handleSelectAllColumns(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer"
                    />
                    <span className="ml-2 text-gray-300 font-semibold text-sm">Select All</span>
                  </label>
                </div>

                {/* Column List */}
                <div className="p-2">
                  {csvColumns.map((column) => (
                    <label key={column} className="flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumns.has(column)}
                        onChange={() => handleColumnToggle(column)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer"
                      />
                      <span className="ml-2 text-gray-300 text-sm capitalize">{column.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Custom Date Range</h2>
            
            <div className="space-y-4">
              {/* From Date Input */}
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">From Date</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* To Date Input */}
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">To Date</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCustomRangeApply}
                disabled={!customFromDate || !customToDate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                Apply
              </button>
              <button
                onClick={handleCustomRangeCancel}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Stat Cards (Grid) --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} chartData={stat.chartData.map((d, i) => ({ name: i, value: d }))} />
        ))}
      </section>

      {/* --- Main Charts Section (Flex/Grid) --- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">

        {/* 1. Attack Timeline - Line Chart */}
        <Card className="h-[450px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Attack Timeline</h2>
    
          </div>
          <div className="flex justify-center space-x-4 text-xs mb-4">
            <span className="flex items-center text-red-400"><div className="w-3 h-3 mr-1 rounded-full bg-red-400"></div>HIGH SEVERITY</span>
            <span className="flex items-center text-yellow-400"><div className="w-3 h-3 mr-1 rounded-full bg-yellow-400"></div>MEDIUM SEVERITY</span>
            <span className="flex items-center text-green-400"><div className="w-3 h-3 mr-1 rounded-full bg-green-400"></div>LOW SEVERITY</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
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
                    height={30}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    tickCount={8}
                    tickFormatter={(value) => {
                      // if value is ISO date -> show only date
                      if (value.includes('T')) {
                        return value.split('T')[0].slice(5); // MM-DD
                      }
                      return value;
                    }}
                    />
                  <YAxis  
                          stroke="#9ca3af"
                          tick={{ fontSize: 10 }}
                          domain={[0, 'auto']}
                          tickCount={5} 
                          />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Line type="monotone" dataKey="HIGH_SEVERITY" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="MEDIUM_SEVERITY" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="LOW_SEVERITY" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  {isLoading ? (
                    <div className="text-gray-400">
                      <div className="animate-spin mb-3">⟳</div>
                      Loading timeline data...
                    </div>
                  ) : (
                    <div>
                      <AlertTriangle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <div className="text-gray-400 font-semibold">No attack data</div>
                      <div className="text-xs text-gray-600 mt-3 max-w-xs">
                        {selectedRange === 'today' 
                          ? '📋 No attacks detected today. Simulator may not have recent data. Try "Last 7 Days" or check backend logs.' 
                          : '📋 No attacks in selected range. Try expanding the date range.'}
                      </div>
                      <div className="text-xs text-gray-700 mt-2 p-2 bg-gray-800 rounded">
                        Open browser console (F12) for detailed debugging info
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 2. Top Threat Sources - Bar Chart */}
        <Card className="h-[450px] flex flex-col">
          <h2 className="text-xl font-bold mb-6">Top Malicious Source IPs</h2>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              {threatSourceData.length > 0 ? (
                <BarChart
                  data={threatSourceData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} width={120} />
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
                <div className="flex flex-col items-center justify-center text-center">
                  {isLoading ? (
                    <div className="text-gray-400">
                      <div className="animate-spin mb-3">⟳</div>
                      Loading threat sources...
                    </div>
                  ) : (
                    <div>
                      <Shield className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <div className="text-gray-400 font-semibold">No threats detected</div>
                      <div className="text-xs text-gray-600 mt-3 max-w-xs">
                        {selectedRange === 'today' 
                          ? '🛡️ No attack sources today. Simulator may not have recent data. Try "Last 7 Days" or check backend logs.' 
                          : '🛡️ No attacks in selected range. Try expanding the date range.'}
                      </div>
                      <div className="text-xs text-gray-700 mt-2 p-2 bg-gray-800 rounded">
                        Open browser console (F12) for detailed debugging info
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* --- AI Chatbot Interface (Fixed) --- */}
      <Chatbot isChatOpen={isChatOpen} toggleChat={toggleChat} />
    </div>
  );
};

export default Dashboard;
