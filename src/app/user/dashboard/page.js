// UserDashboard.js (client component)
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from '../../../supabaseClient';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function UserDashboard({ children }) {

  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [maintenanceData, setMaintenanceData] = useState({});
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [allMaintenanceData, setAllMaintenanceData] = useState([]);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [scheduledMaintenance, setScheduledMaintenance] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    if (currentUser.role !== "user") {
      router.push("/");
      return;
    }
    fetchMaintenanceData();
    fetchTrucks();
    fetchAllMaintenanceData();
  }, [router]);

  
  // Fetch graph data when analytics tab is active or time range changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchGraphData();
    }
  }, [timeRange, activeTab]);

  // Toast notification system
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 5000);
  };

  // Check if date has reached maintenance limit (5 per day)
  const checkMaintenanceLimit = (date) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    const maintenanceCount = maintenanceData[dateStr] ? maintenanceData[dateStr].length : 0;
    return maintenanceCount >= 5;
  };

  // BACKEND FUNCTION: Fetch scheduled maintenance list
  const fetchScheduledMaintenance = async () => {
    try {
      setScheduledLoading(true);
      
      // Fetch scheduled maintenance with related data using Supabase
      const { data: maintenance, error } = await supabase
        .from('maintenance')
        .select(`
          *,
          trucks (
            plate_number,
            current_odometer
          ),
          maintenance_mechanics (
            mechanics (
              name
            )
          )
        `)
        .eq('status', 'Scheduled')
        .order('date', { ascending: true });

      if (error) {
        throw new Error('Failed to fetch scheduled maintenance from database');
      }

      // Transform the data for easier consumption
      const transformedData = maintenance.map(item => ({
        maintenance_id: item.maintenance_id,
        maintenance_type: item.maintenance_type,
        description: item.description,
        status: item.status,
        date: item.date,
        plate_number: item.trucks?.plate_number,
        current_odometer: item.trucks?.current_odometer,
        mechanics: item.maintenance_mechanics?.map(mm => mm.mechanics) || [],
        driver_details: item.driver_details,
        mechanic_name: item.mechanic_name
      }));

      setScheduledMaintenance(transformedData);
      setShowScheduledList(true);
    } catch (error) {
      console.error('Error fetching scheduled maintenance:', error);
      showToast('Error fetching scheduled maintenance list', 'error');
    } finally {
      setScheduledLoading(false);
    }
  };

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch upcoming maintenance (scheduled)
      const { data: maintenance, error } = await supabase
        .from('maintenance')
        .select(`
          *,
          trucks (plate_number, current_odometer),
          maintenance_mechanics (
            mechanics (name)
          )
        `)
        .eq('status', 'Scheduled')
        .order('date', { ascending: true });

      if (error) throw error;

      // Transform data for calendar
      const maintenanceByDate = {};
      maintenance.forEach(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0];
        if (!maintenanceByDate[dateStr]) {
          maintenanceByDate[dateStr] = [];
        }
        maintenanceByDate[dateStr].push({
          id: item.maintenance_id,
          vehicle: `Truck ${item.plate_number}`,
          type: item.maintenance_type,
          status: item.status,
          description: item.description,
          mechanics: item.maintenance_mechanics?.map(mm => mm.mechanics.name) || [],
          plate_number: item.plate_number,
          date: item.date,
          driver_details: item.driver_details,
          mechanic_name: item.mechanic_name
        });
      });

      setMaintenanceData(maintenanceByDate);
      setUpcomingMaintenance(maintenance);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      showToast('Error fetching maintenance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMaintenanceData = async () => {
    try {
      // Fetch ALL maintenance data (not just scheduled) for analytics
      const { data: maintenance, error } = await supabase
        .from('maintenance')
        .select(`
          *,
          trucks (plate_number),
          maintenance_mechanics (
            mechanics (name)
          )
        `)
        .order('date', { ascending: true });

      if (!error) setAllMaintenanceData(maintenance || []);
    } catch (error) {
      console.error('Error fetching all maintenance data:', error);
    }
  };

  const fetchTrucks = async () => {
    const { data, error } = await supabase
      .from('trucks')
      .select('*');
    if (!error) setTrucks(data);
  };

  const fetchGraphData = async () => {
    try {
      setGraphLoading(true);
      
      let startDate, endDate;
      const now = new Date();

      switch (timeRange) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          endDate = new Date();
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
          endDate = new Date();
      }

      // Fetch completed maintenance for the selected time range
      const { data: maintenance, error } = await supabase
        .from('maintenance')
        .select('*')
        .eq('status', 'Completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Process data based on time range
      const processedData = processMaintenanceData(maintenance, timeRange);
      setGraphData(processedData);
    } catch (error) {
      console.error('Error fetching graph data:', error);
      showToast('Error loading maintenance statistics', 'error');
      // Fallback to sample data
      setGraphData(getSampleData()[timeRange]);
    } finally {
      setGraphLoading(false);
    }
  };

  const processMaintenanceData = (maintenance, range) => {
    if (!maintenance || maintenance.length === 0) {
      return getSampleData()[range];
    }

    const maintenanceByPeriod = {};
    
    maintenance.forEach(item => {
      const completedDate = new Date(item.completed_at);
      let periodKey, periodLabel;
      
      switch (range) {
        case 'week':
          // Group by day of week
          periodKey = completedDate.getDay();
          periodLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][periodKey];
          break;
        case 'month':
          // Group by week of month
          const weekOfMonth = Math.floor((completedDate.getDate() - 1) / 7) + 1;
          periodKey = weekOfMonth;
          periodLabel = `Week ${weekOfMonth}`;
          break;
        case 'year':
          // Group by month
          periodKey = completedDate.getMonth();
          periodLabel = completedDate.toLocaleDateString('en-US', { month: 'short' });
          break;
      }

      if (!maintenanceByPeriod[periodKey]) {
        maintenanceByPeriod[periodKey] = { count: 0, label: periodLabel };
      }
      maintenanceByPeriod[periodKey].count++;
    });

    // Fill in missing periods
    const result = fillMissingPeriods(maintenanceByPeriod, range);
    return result;
  };

  const fillMissingPeriods = (data, range) => {
    const periods = {
      week: Array.from({ length: 7 }, (_, i) => ({ 
        label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], 
        count: 0 
      })),
      month: Array.from({ length: 4 }, (_, i) => ({ 
        label: `Week ${i + 1}`, 
        count: 0 
      })),
      year: Array.from({ length: 12 }, (_, i) => ({ 
        label: new Date(0, i).toLocaleDateString('en-US', { month: 'short' }), 
        count: 0 
      }))
    };

    const result = periods[range];
    
    Object.entries(data).forEach(([key, value]) => {
      const index = parseInt(key);
      if (result[index]) {
        result[index].count = value.count;
      }
    });

    return {
      labels: result.map(item => item.label),
      data: result.map(item => item.count),
      total: result.reduce((sum, item) => sum + item.count, 0)
    };
  };

  const getSampleData = () => ({
    week: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [3, 5, 2, 6, 4, 1, 2],
      total: 23
    },
    month: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      data: [12, 8, 15, 10],
      total: 45
    },
    year: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      data: [8, 12, 15, 10, 14, 18, 16, 20, 15, 12, 10, 8],
      total: 158
    }
  });

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Pending Parts': return 'bg-orange-100 text-orange-800';
      case 'In Progress': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // NEW: Render scheduled maintenance list
  const renderScheduledList = () => {
    if (!showScheduledList) return null;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Scheduled Maintenance List</h2>
          <button
            onClick={() => setShowScheduledList(false)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {scheduledLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : scheduledMaintenance.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-calendar-check text-4xl text-gray-300 mb-3"></i>
            <p className="text-gray-500 font-medium">No scheduled maintenance</p>
            <p className="text-gray-400 text-sm">All maintenance tasks are up to date.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
            {scheduledMaintenance.map((item) => (
              <div key={item.maintenance_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">Truck {item.plate_number}</h4>
                    <p className="text-gray-700 font-medium">{item.maintenance_type}</p>
                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                
                {/* Enhanced Maintenance Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <i className="fas fa-tools mr-2 text-gray-400 w-4"></i>
                      <span className="text-gray-600 font-medium">Mechanic:</span>
                      <span className="text-gray-600 ml-1">
                        {item.mechanic_name || item.mechanics?.map(m => m.name).join(', ') || 'Not assigned'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-calendar-day mr-2 text-gray-400 w-4"></i>
                      <span className="text-gray-600 font-medium">Date:</span>
                      <span className="text-gray-600 ml-1">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-user mr-2 text-gray-400 w-4"></i>
                      <span className="text-gray-600 font-medium">Driver:</span>
                      <span className="text-gray-600 ml-1">
                        {item.driver_details || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <i className="fas fa-truck mr-2 text-gray-400 w-4"></i>
                      <span className="text-gray-600 font-medium">Plate:</span>
                      <span className="text-gray-600 ml-1">{item.plate_number}</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-odometer mr-2 text-gray-400 w-4"></i>
                      <span className="text-gray-600 font-medium">Odometer:</span>
                      <span className="text-gray-600 ml-1">{item.current_odometer} km</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-clipboard-list mr-2 text-gray-400 w-4"></i>
                      <span className="text-gray-600 font-medium">Description:</span>
                      <span className="text-gray-600 ml-1">{item.description}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => markAsDone(item.maintenance_id, item.plate_number, item.maintenance_type)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs transition-colors"
                  >
                    Mark as Done
                  </button>
                  <button
                    onClick={() => cancelMaintenance(item.maintenance_id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    if (loading) {
      return Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse"></div>
      ));
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-gray-50 rounded-lg border border-gray-100"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasMaintenance = maintenanceData[dateStr];
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
      const isAtLimit = checkMaintenanceLimit(dateStr);

      days.push(
        <div
          key={day}
          className={`h-28 p-2 border-2 rounded-xl transition-all duration-300 cursor-pointer group relative overflow-hidden ${
            isSelected 
              ? 'border-blue-500 bg-blue-50 shadow-md scale-105' 
              : hasMaintenance 
                ? isAtLimit
                  ? 'border-red-200 bg-red-25'
                  : 'border-blue-200 bg-blue-25'
                : 'border-gray-200'
          } ${
            isToday 
              ? 'border-blue-400 bg-blue-25 shadow-sm' 
              : ''
          } ${
            isWeekend 
              ? 'bg-gray-25' 
              : 'bg-white'
          } hover:shadow-md hover:scale-105 hover:border-blue-300`}
          onClick={() => setSelectedDate(dateStr)}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-semibold ${
              isToday 
                ? 'text-blue-600' 
                : isWeekend 
                  ? 'text-gray-500' 
                  : 'text-gray-700'
            }`}>
              {day}
            </span>
            {hasMaintenance && (
              <div className={`flex items-center justify-center w-5 h-5 text-white text-xs font-bold rounded-full ${
                isAtLimit ? 'bg-red-500' : 'bg-blue-500'
              }`}>
                {hasMaintenance.length}
              </div>
            )}
          </div>
          
          <div className="space-y-1 max-h-16 overflow-y-auto scrollbar-thin">
            {hasMaintenance && hasMaintenance.slice(0, 2).map((item, index) => (
              <div 
                key={index}
                className={`text-xs p-1 rounded-md truncate ${getStatusColor(item.status)}`}
                title={`${item.vehicle} - ${item.type}`}
              >
                <div className="font-medium truncate">{item.vehicle}</div>
                <div className="truncate text-xs opacity-90">{item.type}</div>
              </div>
            ))}
            {hasMaintenance && hasMaintenance.length > 2 && (
              <div className="text-xs text-gray-500 text-center bg-gray-100 py-1 rounded">
                +{hasMaintenance.length - 2} more
              </div>
            )}
            {isAtLimit && (
              <div className="text-xs text-red-600 text-center bg-red-100 py-1 rounded font-medium">
                Limit Reached
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const showMaintenanceDetails = () => {
    if (!selectedDate) return null;

    const maintenanceItems = maintenanceData[selectedDate] || [];
    const isAtLimit = checkMaintenanceLimit(selectedDate);

    return (
      <div id="maintenance-details" className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 id="selected-date" className="text-xl font-bold text-gray-900">
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <button
            onClick={() => setSelectedDate(null)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        
        {/* Maintenance Limit Warning */}
        {isAtLimit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
              <div>
                <p className="text-red-800 font-medium">Maintenance Limit Reached</p>
                <p className="text-red-600 text-sm">Maximum 5 maintenance tasks allowed per day</p>
              </div>
            </div>
          </div>
        )}
        
        <div id="maintenance-list" className="space-y-4">
          {maintenanceItems.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-wrench text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 font-medium">No maintenance scheduled</p>
              <p className="text-gray-400 text-sm">No maintenance tasks are scheduled for this date.</p>
            </div>
          ) : (
            maintenanceItems.map((item) => (
              <div key={item.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 mb-1">{item.vehicle}</h4>
                    <p className="text-gray-700 font-medium">{item.type}</p>
                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                
                {/* Enhanced Maintenance Details with requested fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <i className="fas fa-tools mr-3 text-gray-400 w-5"></i>
                      <div>
                        <span className="text-gray-600 font-medium">Mechanic Name:</span>
                        <span className="text-gray-800 ml-2">{item.mechanic_name || item.mechanics.join(', ') || 'Not assigned'}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-clipboard-list mr-3 text-gray-400 w-5"></i>
                      <div>
                        <span className="text-gray-600 font-medium">Description:</span>
                        <span className="text-gray-800 ml-2">{item.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-user mr-3 text-gray-400 w-5"></i>
                      <div>
                        <span className="text-gray-600 font-medium">Driver Details:</span>
                        <span className="text-gray-800 ml-2">{item.driver_details || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <i className="far fa-calendar mr-3 text-gray-400 w-5"></i>
                      <div>
                        <span className="text-gray-600 font-medium">Date of Maintenance:</span>
                        <span className="text-gray-800 ml-2">{selectedDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-truck mr-3 text-gray-400 w-5"></i>
                      <div>
                        <span className="text-gray-600 font-medium">Plate Number:</span>
                        <span className="text-gray-800 ml-2">{item.plate_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-info-circle mr-3 text-gray-400 w-5"></i>
                      <div>
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="text-gray-800 ml-2">{item.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => markAsDone(item.id, item.plate_number, item.type)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm transition-colors"
                  >
                    Mark as Done
                  </button>
                  <button
                    onClick={() => cancelMaintenance(item.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Maintenance Actions
  const markAsDone = async (maintenanceId, plateNumber, maintenanceType) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!storedUser?.id) {
        showToast('You must be logged in to mark maintenance as done', 'error');
        return;
      }

      // Update maintenance to completed
      const { error: updateError } = await supabase
        .from('maintenance')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
          completed_by: storedUser.id,
        })
        .eq('maintenance_id', maintenanceId);
      
      if (updateError) throw updateError;

      // Update truck status back to Available
      await supabase.from('trucks').update({ status: 'Available' }).eq('plate_number', plateNumber);

      showToast(`Maintenance for ${plateNumber} marked as completed`, 'success');
      fetchMaintenanceData();
      fetchTrucks();
      fetchAllMaintenanceData();
      // Refresh scheduled list if it's open
      if (showScheduledList) {
        fetchScheduledMaintenance();
      }
      // Refresh graph data if we're on analytics tab
      if (activeTab === 'analytics') {
        fetchGraphData();
      }
    } catch (err) {
      console.error("❌ Error marking maintenance as done:", err);
      showToast('Failed to mark maintenance as done', 'error');
    }
  };

  const cancelMaintenance = async (maintenanceId) => {
    try {
      // Return items to inventory
      const { data: usedItems, error: itemsError } = await supabase
        .from('maintenance_items')
        .select('item_id, quantity')
        .eq('maintenance_id', maintenanceId);
      
      if (!itemsError && usedItems) {
        for (const item of usedItems) {
          await supabase.rpc('increment_inventory_quantity', {
            item_id_input: item.item_id,
            qty_input: item.quantity,
          });
        }
      }

      // Delete maintenance records
      await supabase.from('maintenance_items').delete().eq('maintenance_id', maintenanceId);
      await supabase.from('maintenance_mechanics').delete().eq('maintenance_id', maintenanceId);
      await supabase.from('maintenance').delete().eq('maintenance_id', maintenanceId);

      showToast('Maintenance canceled and items returned to inventory', 'success');
      fetchMaintenanceData();
      fetchAllMaintenanceData();
      // Refresh scheduled list if it's open
      if (showScheduledList) {
        fetchScheduledMaintenance();
      }
    } catch (err) {
      console.error('Cancel error:', err);
      showToast('Failed to cancel maintenance', 'error');
    }
  };

  // Analytics Data - FIXED VERSION
  const getAnalyticsData = () => {
    const truckMaintenanceCount = {};
    
    // Use allMaintenanceData instead of maintenanceData
    allMaintenanceData.forEach(item => {
      const truckName = `Truck ${item.plate_number}`;
      if (!truckMaintenanceCount[truckName]) {
        truckMaintenanceCount[truckName] = 0;
      }
      truckMaintenanceCount[truckName]++;
    });

    const sortedTrucks = Object.entries(truckMaintenanceCount)
      .sort(([,a], [,b]) => b - a)
      .map(([truck, count]) => ({ name: truck, maintenanceCount: count }));

    // Better categorization based on actual data distribution
    const totalTrucks = sortedTrucks.length;
    
    let frequent, moderate, infrequent;
    
    if (totalTrucks === 0) {
      // Return empty arrays if no data
      return {
        frequent: [],
        moderate: [],
        infrequent: []
      };
    } else if (totalTrucks <= 3) {
      // If few trucks, put all in frequent
      frequent = sortedTrucks;
      moderate = [];
      infrequent = [];
    } else {
      // Distribute based on maintenance count percentiles
      const maintenanceCounts = sortedTrucks.map(t => t.maintenanceCount);
      const maxCount = Math.max(...maintenanceCounts);
      const minCount = Math.min(...maintenanceCounts);
      const range = maxCount - minCount;
      
      frequent = sortedTrucks.filter(truck => 
        truck.maintenanceCount >= minCount + (range * 0.7)
      );
      moderate = sortedTrucks.filter(truck => 
        truck.maintenanceCount >= minCount + (range * 0.3) && 
        truck.maintenanceCount < minCount + (range * 0.7)
      );
      infrequent = sortedTrucks.filter(truck => 
        truck.maintenanceCount < minCount + (range * 0.3)
      );
      
      // Ensure at least one truck in each category if we have enough data
      if (frequent.length === 0 && sortedTrucks.length >= 3) {
        frequent = sortedTrucks.slice(0, 1);
        moderate = sortedTrucks.slice(1, 2);
        infrequent = sortedTrucks.slice(2);
      }
    }

    return {
      frequent, // Removed the 3-item limit
      moderate, // Removed the 3-item limit
      infrequent // Removed the 3-item limit
    };
  };

  const renderAnalyticsTab = () => {
    const currentStats = graphData || getSampleData()[timeRange];
    const maxValue = Math.max(...currentStats.data, 1); // Ensure at least 1 to avoid division by zero

    const truckMaintenanceData = getAnalyticsData();
    const totalMaintenanceCount = Object.values(maintenanceData).flat().length;
    const frequentTrucksCount = truckMaintenanceData.frequent.length;

    // Chart.js configuration
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            stepSize: 1,
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    };

    const chartData = {
      labels: currentStats.labels,
      datasets: [
        {
          label: 'Completed Maintenance',
          data: currentStats.data,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
        },
      ],
    };

    return (
      <div className="space-y-6">
        {/* Summary Cards - FIXED COLORS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Scheduled Maintenance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalMaintenanceCount}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <i className="fas fa-tools text-white text-xl"></i>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Upcoming maintenance across all trucks
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Completed This {timeRange === 'week' ? 'Week' : timeRange === 'month' ? 'Month' : 'Year'}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{currentStats.total}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <i className="fas fa-check-circle text-white text-xl"></i>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Maintenance tasks completed
            </div>
          </div>
        </div>

        {/* Maintenance Graph - UPDATED TO BAR CHART */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Completed Maintenance</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === 'year'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Year
              </button>
            </div>
          </div>

          {graphLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-pulse bg-gray-300 rounded-lg w-full h-48"></div>
            </div>
          ) : (
            <>
              <div className="h-48">
                <Bar data={chartData} options={chartOptions} />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-600">
                  Total completed maintenance this {timeRange}: <span className="font-bold text-gray-900">{currentStats.total}</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Truck Maintenance Frequency - FIXED SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Frequent Maintenance */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Frequent Maintenance</h3>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                High
              </span>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin pr-2">
              {truckMaintenanceData.frequent.length > 0 ? (
                truckMaintenanceData.frequent.map((truck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <div className="font-semibold text-gray-900">{truck.name}</div>
                    <div className="text-lg font-bold text-red-600">{truck.maintenanceCount}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No frequent maintenance data
                </div>
              )}
            </div>
          </div>

          {/* Moderate Maintenance */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Moderate Maintenance</h3>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                Medium
              </span>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin pr-2">
              {truckMaintenanceData.moderate.length > 0 ? (
                truckMaintenanceData.moderate.map((truck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                    <div className="font-semibold text-gray-900">{truck.name}</div>
                    <div className="text-lg font-bold text-yellow-600">{truck.maintenanceCount}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No moderate maintenance data
                </div>
              )}
            </div>
          </div>

          {/* Infrequent Maintenance */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Infrequent Maintenance</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                Low
              </span>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin pr-2">
              {truckMaintenanceData.infrequent.length > 0 ? (
                truckMaintenanceData.infrequent.map((truck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="font-semibold text-gray-900">{truck.name}</div>
                    <div className="text-lg font-bold text-green-600">{truck.maintenanceCount}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No infrequent maintenance data
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAvailabilityTab = () => {
    const availableCount = trucks.filter(v => v.status === 'Available').length;
    const maintenanceCount = trucks.filter(v => v.status === 'Maintenance').length;
    const totalCount = trucks.length;

    return (
      <div className="space-y-6">
        {/* Availability Overview - FIXED COLORS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Vehicles</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalCount}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <i className="fas fa-truck text-white text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Available Now</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{availableCount}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <i className="fas fa-check-circle text-white text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">In Maintenance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{maintenanceCount}</p>
              </div>
              <div className="p-3 bg-red-500 rounded-xl">
                <i className="fas fa-tools text-white text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Availability Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Vehicle Distribution</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available Vehicles</span>
                  <span className="font-bold text-green-600">{availableCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vehicles in Maintenance</span>
                  <span className="font-bold text-red-600">{maintenanceCount}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-gray-700 font-medium">Total Fleet</span>
                  <span className="font-bold text-gray-900">{totalCount}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Availability Rate</h4>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeDasharray={`${totalCount > 0 ? (availableCount / totalCount) * 100 : 0}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-25 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Maintenance Dashboard
            </h1>
            <p className="text-gray-600">Manage and track your vehicle maintenance schedule</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'calendar'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="far fa-calendar mr-2"></i>
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'analytics'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-chart-bar mr-2"></i>
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'availability'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-truck mr-2"></i>
              Vehicle Availability
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Header with Scheduled List Button */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Maintenance Calendar</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    Click on a date to view maintenance details
                  </div>
                  <button
                    onClick={fetchScheduledMaintenance}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium text-sm"
                  >
                    <i className="fas fa-list"></i>
                    <span>View Scheduled List</span>
                  </button>
                </div>
              </div>

              {/* Calendar Navigation */}
              <div className="flex justify-between items-center mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="flex items-center space-x-3 px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all duration-300 group min-w-[140px]"
                >
                  <i className="fas fa-chevron-left text-gray-600 group-hover:text-blue-600 transition-colors"></i>
                  <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                    Previous
                  </span>
                </button>
                
                <h3 className="text-2xl font-bold text-center text-gray-800 px-6 py-3 bg-white rounded-xl border border-gray-200 shadow-sm min-w-[280px]">
                  {currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                
                <button 
                  onClick={() => navigateMonth(1)}
                  className="flex items-center space-x-3 px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all duration-300 group min-w-[140px]"
                >
                  <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                    Next
                  </span>
                  <i className="fas fa-chevron-right text-gray-600 group-hover:text-blue-600 transition-colors"></i>
                </button>
              </div>
              
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-gray-500 py-3 text-sm bg-gray-50 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendar()}
              </div>

              {/* Quick Navigation Buttons */}
              <div className="flex justify-center space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium text-sm"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Scheduled Maintenance List */}
            {showScheduledList && renderScheduledList()}

            {/* Maintenance Details Sidebar */}
            {selectedDate && !showScheduledList && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Maintenance Details</h2>
                {showMaintenanceDetails()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'availability' && renderAvailabilityTab()}
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg border-l-4 max-w-sm transition-all duration-300 ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-800' 
                : notification.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-800'
                : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}
          >
            <div className="flex items-center">
              <i className={`fas ${
                notification.type === 'success' 
                  ? 'fa-check-circle' 
                  : notification.type === 'error'
                  ? 'fa-exclamation-circle'
                  : 'fa-info-circle'
              } mr-2`}></i>
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
}