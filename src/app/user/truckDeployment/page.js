"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Truck, Calendar, AlertTriangle, CheckCircle, X, Clock, MapPin, RefreshCw } from "lucide-react";
import supabase from "../../../supabaseClient";
import DeployTruckModal from "./DeployTruckModal";

// Enhanced Alert Popup
const AlertPopup = ({ message, type = "info", onClose }) => (
  <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-50">
    <div className={`bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 border-l-4 ${
      type === "error" ? "border-red-500" : 
      type === "warning" ? "border-yellow-500" : 
      type === "success" ? "border-green-500" : 
      "border-blue-500"
    }`}>
      <div className="flex items-center mb-4">
        <div className={`p-2 rounded-full mr-3 ${
          type === "error" ? "bg-red-100" : 
          type === "warning" ? "bg-yellow-100" : 
          type === "success" ? "bg-green-100" : 
          "bg-blue-100"
        }`}>
          {type === "error" ? (
            <X className="w-6 h-6 text-red-600" />
          ) : type === "warning" ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          ) : type === "success" ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-800">
          {type === "error" ? "Error" : type === "warning" ? "Warning" : type === "success" ? "Success" : "Notification"}
        </h3>
      </div>
      <p className="text-gray-700 mb-6 pl-11">{message}</p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className={`font-semibold py-2 px-6 rounded-lg transition duration-300 shadow-sm ${
            type === "error" ? "bg-red-600 hover:bg-red-700" : 
            type === "warning" ? "bg-yellow-600 hover:bg-yellow-700" : 
            type === "success" ? "bg-green-600 hover:bg-green-700" : 
            "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// Deployment Status Badge Component
const DeploymentStatusBadge = ({ status }) => {
  const statusConfig = {
    "Deployed": { color: "bg-yellow-100 text-yellow-800", icon: MapPin },
    "Available": { color: "bg-green-100 text-green-800", icon: CheckCircle },
    "Maintenance": { color: "bg-red-100 text-red-800", icon: AlertTriangle },
    "Scheduled": { color: "bg-blue-100 text-blue-800", icon: Clock }
  };

  const config = statusConfig[status] || statusConfig.Available;
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {status}
    </span>
  );
};

const TruckDeploymentPage = () => {
  const router = useRouter();
  const [trucks, setTrucks] = useState([]);
  const [activeDeployments, setActiveDeployments] = useState([]);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");
  const [activeTab, setActiveTab] = useState("active"); // "active" or "history"

  // Alert management
  const showAlertPopup = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const closeAlertPopup = () => {
    setShowAlert(false);
    setAlertMessage("");
  };

  // Authentication check and data fetching
  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    setCurrentUser(currentUser);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTrucks(),
        fetchActiveDeployments(),
        fetchDeploymentHistory()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      showAlertPopup("Failed to load deployment data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch trucks (not archived)
  const fetchTrucks = async () => {
    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching trucks:", error);
      throw error;
    }
    setTrucks(data || []);
  };

  // Fetch active deployments
  const fetchActiveDeployments = async () => {
    const { data, error } = await supabase
      .from("truck_deployments")
      .select(`
        *,
        trucks (plate_number, brand, model, type, current_odometer, status),
        drivers (driver_id, name)
      `)
      .is("returned_at", null)
      .order("deployed_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching active deployments:", error);
      throw error;
    }
    setActiveDeployments(data || []);
  };

  // Fetch deployment history
  const fetchDeploymentHistory = async () => {
    const { data, error } = await supabase
      .from("truck_deployments")
      .select(`
        *,
        trucks (plate_number, brand, model, type),
        drivers (driver_id, name)
      `)
      .not("returned_at", "is", null)
      .order("deployed_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Error fetching deployment history:", error);
      throw error;
    }
    setDeploymentHistory(data || []);
  };

  // Get Philippines time (UTC+8)
  const getPhilippinesTime = () => {
    return new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila"
    });
  };

  // Format date for display in Philippines time
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      timeZone: "Asia/Manila",
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display in Philippines time
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-PH', {
      timeZone: "Asia/Manila",
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate deployment duration
  const calculateDuration = (deployedAt, returnedAt = null) => {
    const start = new Date(deployedAt);
    const end = returnedAt ? new Date(returnedAt) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  };

  // Check if truck can be deployed or returned
  const canManageTruck = (truck) => {
    if (!truck.driver) {
      return { canManage: false, reason: "No driver assigned to this truck" };
    }
    if (truck.status === "Maintenance") {
      return { canManage: false, reason: "Truck is currently in maintenance" };
    }
    if (truck.status === "Scheduled") {
      return { canManage: false, reason: "Truck is currently scheduled" };
    }
    // For deployed trucks, we should be able to return them
    if (truck.status === "Deployed") {
      return { canManage: true, reason: "" };
    }
    // For available trucks, we should be able to deploy them
    if (truck.status === "Available") {
      return { canManage: true, reason: "" };
    }
    return { canManage: false, reason: "Truck status cannot be managed" };
  };

  // Open deploy modal with validation
  const openDeployModal = (truck) => {
    const manageCheck = canManageTruck(truck);
    if (!manageCheck.canManage) {
      showAlertPopup(manageCheck.reason, "error");
      return;
    }
    setSelectedTruck(truck);
    setIsDeployModalOpen(true);
  };

  // Handle deployment success
  const handleDeploymentSuccess = () => {
    fetchData();
    setIsDeployModalOpen(false);
    setSelectedTruck(null);
    showAlertPopup("Truck deployed successfully!", "success");
  };

  // Handle return success
  const handleReturnSuccess = () => {
    fetchData();
    setIsDeployModalOpen(false);
    setSelectedTruck(null);
    showAlertPopup("Truck returned successfully!", "success");
  };

  // Get deployed trucks (trucks with status "Deployed")
  const deployedTrucks = trucks.filter(truck => truck.status === "Deployed");

  // Redirect to login if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Truck Deployment</h1>
          </div>
          <p className="text-gray-600">Manage truck deployments and monitor active missions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Trucks</p>
                <p className="text-2xl font-bold text-gray-900">{trucks.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                <MapPin className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Currently Deployed</p>
                <p className="text-2xl font-bold text-gray-900">{deployedTrucks.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available Trucks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {trucks.filter(t => t.status === "Available").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("active")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Active Deployments ({deployedTrucks.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Deployment History ({deploymentHistory.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : activeTab === "active" ? (
              <ActiveDeploymentsTab
                trucks={trucks}
                deployedTrucks={deployedTrucks}
                onDeployTruck={openDeployModal}
                onRefresh={fetchData}
                canManageTruck={canManageTruck}
              />
            ) : (
              <DeploymentHistoryTab
                deploymentHistory={deploymentHistory}
                calculateDuration={calculateDuration}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            )}
          </div>
        </div>

        {/* Deploy Modal - Using your existing component */}
        {selectedTruck && (
          <DeployTruckModal
            isOpen={isDeployModalOpen}
            onClose={() => {
              setIsDeployModalOpen(false);
              setSelectedTruck(null);
            }}
            truck={selectedTruck}
            refreshTrucks={fetchData}
            currentUser={currentUser}
            onDeploymentSuccess={handleDeploymentSuccess}
            onReturnSuccess={handleReturnSuccess}
            getPhilippinesTime={getPhilippinesTime}
          />
        )}

        {/* Alert Popup */}
        {showAlert && (
          <AlertPopup 
            message={alertMessage} 
            type={alertType} 
            onClose={closeAlertPopup} 
          />
        )}
      </div>
    </div>
  );
};

// Active Deployments Tab Component
const ActiveDeploymentsTab = ({ 
  trucks, 
  deployedTrucks, 
  onDeployTruck, 
  onRefresh,
  canManageTruck 
}) => {
  const availableTrucks = trucks.filter(truck => 
    truck.status === "Available" && truck.driver
  );

  return (
    <div className="space-y-8">
      {/* Currently Deployed Trucks Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Currently Deployed Trucks
          </h3>
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        {deployedTrucks.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="mt-4 text-lg font-medium text-gray-900">No deployed trucks</h4>
            <p className="mt-2 text-gray-500">All trucks are currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deployedTrucks.map((truck) => {
              const manageCheck = canManageTruck(truck);
              return (
                <div key={truck.plate_number} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{truck.plate_number}</h4>
                    <DeploymentStatusBadge status={truck.status} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {truck.brand} {truck.model} • {truck.type}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Odometer: {truck.current_odometer?.toLocaleString()} km
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Driver: {truck.driver || "Not assigned"}
                  </p>
                  <button
                    onClick={() => onDeployTruck(truck)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                  >
                    Return Truck
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Trucks Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Available Trucks for Deployment
        </h3>
        {availableTrucks.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="mt-4 text-lg font-medium text-gray-900">No trucks available</h4>
            <p className="mt-2 text-gray-500">All trucks are currently deployed or in maintenance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTrucks.map((truck) => {
              const manageCheck = canManageTruck(truck);
              return (
                <div key={truck.plate_number} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{truck.plate_number}</h4>
                    <DeploymentStatusBadge status={truck.status} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {truck.brand} {truck.model} • {truck.type}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Odometer: {truck.current_odometer?.toLocaleString()} km
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Driver: {truck.driver || "Not assigned"}
                  </p>
                  <button
                    onClick={() => onDeployTruck(truck)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                  >
                    Deploy Truck
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Deployment History Tab Component
const DeploymentHistoryTab = ({ deploymentHistory, calculateDuration, formatDate, formatTime }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Deployment History
      </h3>
      {deploymentHistory.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h4 className="mt-4 text-lg font-medium text-gray-900">No deployment history</h4>
          <p className="mt-2 text-gray-500">Deployment records will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck & Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deployment Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deploymentHistory.map((deployment) => (
                <tr key={deployment.deployment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {deployment.trucks?.plate_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {deployment.drivers?.name || "No driver assigned"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{formatDate(deployment.deployed_at)}</div>
                    <div className="text-gray-500 text-xs">
                      {formatTime(deployment.deployed_at)} - {formatTime(deployment.returned_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calculateDuration(deployment.deployed_at, deployment.returned_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deployment.travel_distance ? `${deployment.travel_distance.toLocaleString()} km` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TruckDeploymentPage;