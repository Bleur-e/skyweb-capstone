"use client";
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import supabase from "../../../supabaseClient";
import ConfirmPopup from "../../../components/ConfirmPopup";

// 🔔 Reusable Alert Popup
const AlertPopup = ({ message, type = "error", onClose }) => (
  <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-50">
    <div className={`bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border-l-8 ${
      type === "error" ? "border-red-600" : 
      type === "warning" ? "border-yellow-600" : 
      "border-green-600"
    }`}>
      <h3 className={`text-xl font-bold mb-3 ${
        type === "error" ? "text-red-600" : 
        type === "warning" ? "text-yellow-600" : 
        "text-green-600"
      }`}>
        {type === "error" ? "Error" : type === "warning" ? "Warning" : "Success"}
      </h3>
      <p className="text-gray-700 mb-5">{message}</p>
      <div className="flex justify-end">
        <button 
          onClick={onClose} 
          className={`${
            type === "error" ? "bg-red-600 hover:bg-red-700" : 
            type === "warning" ? "bg-yellow-600 hover:bg-yellow-700" : 
            "bg-green-600 hover:bg-green-700"
          } text-white px-4 py-2 rounded-md font-semibold`}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export default function DeployTruckModal({
  isOpen,
  onClose,
  truck,
  refreshTrucks,
  currentUser,
  onDeploymentSuccess,
  onReturnSuccess
}) {
  const [returnOdometer, setReturnOdometer] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [oilChangeInfo, setOilChangeInfo] = useState(null);
  const [currentTruck, setCurrentTruck] = useState(truck); // Local state for truck data

  const [showPopup, setShowPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error");

  // Get Philippines time as ISO string
  const getPhilippinesTimeISO = () => {
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    return phTime.toISOString();
  };

  // Reset all states when modal closes
  const resetStates = () => {
    setReturnOdometer("");
    setIsDeploying(false);
    setIsReturning(false);
    setIsCancelling(false);
    setShowConfirmCancel(false);
    setShowPopup(false);
    setAlertMessage("");
    setOilChangeInfo(null);
  };

  // Update currentTruck when truck prop changes
  useEffect(() => {
    setCurrentTruck(truck);
  }, [truck]);

  useEffect(() => {
    if (!isOpen) {
      resetStates();
    } else {
      checkOilChangeStatus();
      // Refresh truck data when modal opens
      refreshTruckData();
    }
  }, [isOpen, truck]);

  const refreshTruckData = async () => {
    try {
      const { data: truckData, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("plate_number", truck.plate_number)
        .single();
      
      if (!error && truckData) {
        setCurrentTruck(truckData);
      }
    } catch (error) {
      console.error("Error refreshing truck data:", error);
    }
  };

  const checkOilChangeStatus = async () => {
    try {
      const { data: truckData, error } = await supabase
        .from("trucks")
        .select(`
          current_odometer,
          last_change_oil_odometer,
          next_change_oil_odometer,
          truck_specs(change_oil_interval)
        `)
        .eq("plate_number", truck.plate_number)
        .single();

      if (error) throw error;

      const currentOdo = truckData.current_odometer || 0;
      const nextChangeOdo = truckData.next_change_oil_odometer || 0;
      const interval = truckData.truck_specs?.change_oil_interval || 0;

      // Calculate remaining distance to next oil change
      const remainingDistance = nextChangeOdo - currentOdo;

      setOilChangeInfo({
        currentOdometer: currentOdo,
        nextChangeOdometer: nextChangeOdo,
        remainingDistance,
        interval
      });

    } catch (error) {
      console.error("Error checking oil change status:", error);
    }
  };

  const showAlertPopup = (message, type = "error") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowPopup(true);
  };

  const closeAlertPopup = () => {
    setShowPopup(false);
    setAlertMessage("");
  };

  const addAuditLog = async (action, description, recordId = null) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase.from("audit_logs").insert([
        {
          user_id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
          action: action,
          table_name: "truck_deployments",
          record_id: recordId,
          description: description,
          created_at: getPhilippinesTimeISO(),
        },
      ]);
      
      if (error) {
        console.error('Error adding audit log:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to add audit log:', error);
    }
  };

  // Check if truck can be deployed based on various conditions
  const canDeployTruck = () => {
    // Check if truck has no driver assigned
    if (!currentTruck.driver) {
      showAlertPopup("No driver assigned to this truck. Please assign a driver first.");
      return false;
    }

    // Check if truck is in maintenance
    if (currentTruck.status === "Maintenance") {
      showAlertPopup("Cannot deploy: Truck is currently in maintenance.");
      return false;
    }

    // Check if truck is scheduled
    if (currentTruck.status === "Scheduled") {
      showAlertPopup("Cannot deploy: Truck is currently scheduled for deployment.");
      return false;
    }

    // Check if truck is already deployed
    if (currentTruck.status === "Deployed") {
      // This is fine - we're handling return flow
      return true;
    }

    // Check oil change status
    if (!oilChangeInfo) return true;

    const { remainingDistance } = oilChangeInfo;
    
    // Block deployment if oil change is overdue (remaining distance is negative)
    if (remainingDistance < 0) {
      showAlertPopup(
        "🚫 Cannot deploy: Truck needs oil change immediately! Please schedule maintenance first.",
        "error"
      );
      return false;
    }

    return true;
  };

  // 🚛 DEPLOY (No distance input needed)
  const handleDeploy = async () => {
    if (!canDeployTruck()) return;

    setIsDeploying(true);

    try {
      // Double check status conditions before deploying
      if (currentTruck.status === "Maintenance" || currentTruck.status === "Scheduled") {
        showAlertPopup(`Cannot deploy: Truck is currently in ${currentTruck.status.toLowerCase()}.`);
        setIsDeploying(false);
        return;
      }

      // Check oil change status one more time before deploying
      const { data: truckData, error: fetchError } = await supabase
        .from("trucks")
        .select("current_odometer, next_change_oil_odometer, status")
        .eq("plate_number", currentTruck.plate_number)
        .single();

      if (fetchError) throw fetchError;

      const currentOdo = truckData.current_odometer || 0;
      const nextChangeOdo = truckData.next_change_oil_odometer || 0;

      // Final check: block deployment if overdue
      if (currentOdo > nextChangeOdo) {
        showAlertPopup(
          "🚫 Cannot deploy: Truck needs oil change immediately! Please schedule maintenance first.",
          "error"
        );
        setIsDeploying(false);
        return;
      }

      // 🚀 Deploy truck with Philippines time
      const { data: deploymentData, error: deployError } = await supabase
        .from("truck_deployments")
        .insert([
          {
            plate_number: currentTruck.plate_number,
            driver_id: currentTruck.driver,
            deployed_at: getPhilippinesTimeISO(),
          },
        ])
        .select()
        .single();

      if (deployError) throw new Error(deployError.message || "Failed to deploy truck.");

      const { error: updateError } = await supabase
        .from("trucks")
        .update({ status: "Deployed" })
        .eq("plate_number", currentTruck.plate_number);
      
      if (updateError) throw new Error(updateError.message || "Failed to update truck status.");

      // Add audit log with proper action
      await addAuditLog(
        "Deployed", 
        `Truck ${currentTruck.plate_number} deployed with driver ${currentTruck.driver}`,
        deploymentData.deployment_id
      );

      // Refresh local truck data immediately
      await refreshTruckData();

      if (typeof refreshTrucks === "function") await refreshTrucks();
      
      // Call success callback
      if (onDeploymentSuccess) {
        onDeploymentSuccess();
      } else {
        // Fallback to old behavior
        onClose();
        showAlertPopup(`✅ Truck deployed successfully.`, "success");
      }
    } catch (err) {
      console.error("Deploy error:", err);
      showAlertPopup(`Deployment failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const confirmCancelDeployment = () => setShowConfirmCancel(true);

  const handleCancelDeployment = async () => {
    setIsCancelling(true);

    try {
      const { data: deployment, error: fetchErr } = await supabase
        .from("truck_deployments")
        .select("*")
        .eq("plate_number", currentTruck.plate_number)
        .is("returned_at", null)
        .order("deployed_at", { ascending: false })
        .limit(1)
        .single();
      
      if (fetchErr) throw fetchErr;

      if (deployment) {
        // Update deployment with cancel time (using returned_at since we don't have canceled_at)
        await supabase
          .from("truck_deployments")
          .update({ 
            returned_at: getPhilippinesTimeISO(),
            travel_distance: 0
          })
          .eq("deployment_id", deployment.deployment_id);
      }

      await supabase
        .from("trucks")
        .update({ status: "Available" })
        .eq("plate_number", currentTruck.plate_number);

      // Refresh local truck data immediately
      await refreshTruckData();

      await addAuditLog(
        "Cancelled",
        `Deployment for truck ${currentTruck.plate_number} was cancelled.`,
        deployment?.deployment_id
      );

      if (typeof refreshTrucks === "function") await refreshTrucks();
      
      // Close everything
      setShowConfirmCancel(false);
      onClose();
      
      if (onReturnSuccess) {
        onReturnSuccess();
      }
    } catch (err) {
      console.error("Cancel deployment error:", err);
      showAlertPopup("Failed to cancel deployment. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturn = async () => {
    if (isReturning) return;
    setIsReturning(true);

    try {
      // Validate return odometer
      const newOdometer = Number(returnOdometer);
      if (!newOdometer || newOdometer <= 0) {
        showAlertPopup("Please enter a valid odometer reading.");
        setIsReturning(false);
        return;
      }

      if (newOdometer < currentTruck.current_odometer) {
        showAlertPopup("Return odometer cannot be less than current odometer.");
        setIsReturning(false);
        return;
      }

      const { data: deployments, error: fetchErr } = await supabase
        .from("truck_deployments")
        .select("*")
        .eq("plate_number", currentTruck.plate_number)
        .is("returned_at", null)
        .order("deployed_at", { ascending: false })
        .limit(1);
      
      if (fetchErr) throw fetchErr;

      if (!deployments || deployments.length === 0) {
        showAlertPopup("No active deployment found. Resetting to Available.");
        await supabase
          .from("trucks")
          .update({ status: "Available" })
          .eq("plate_number", currentTruck.plate_number);
        
        // Refresh local truck data immediately
        await refreshTruckData();
        
        await addAuditLog(
          "Edit", 
          `Truck ${currentTruck.plate_number} reset to Available - no active deployment found.`
        );
        
        if (typeof refreshTrucks === "function") await refreshTrucks();
        onClose();
        return;
      }

      const latest = deployments[0];

      // Calculate distance traveled
      const distanceTraveled = newOdometer - currentTruck.current_odometer;

      // Update deployment with return info using Philippines time
      await supabase
        .from("truck_deployments")
        .update({ 
          returned_at: getPhilippinesTimeISO(),
          travel_distance: distanceTraveled,
          return_odometer: newOdometer
        })
        .eq("deployment_id", latest.deployment_id);

      // Update truck odometer and status
      await supabase
        .from("trucks")
        .update({ 
          status: "Available", 
          current_odometer: newOdometer 
        })
        .eq("plate_number", currentTruck.plate_number);

      // Refresh local truck data immediately
      await refreshTruckData();

      // Check and create oil change notifications
      await checkAndCreateOilChangeNotifications(newOdometer);

      await addAuditLog(
        "Edit",
        `Truck ${currentTruck.plate_number} returned - traveled ${distanceTraveled} km, odometer updated to ${newOdometer} km.`,
        latest.deployment_id
      );

      if (typeof refreshTrucks === "function") await refreshTrucks();
      
      // Call success callback
      if (onReturnSuccess) {
        onReturnSuccess();
      } else {
        // Fallback to old behavior
        onClose();
      }
    } catch (err) {
      console.error("Return error:", err);
      showAlertPopup("An error occurred while returning the truck.");
    } finally {
      setIsReturning(false);
    }
  };

  const checkAndCreateOilChangeNotifications = async (newOdometer) => {
    try {
      const { data: truckData, error } = await supabase
        .from("trucks")
        .select(`
          plate_number,
          next_change_oil_odometer,
          truck_specs(change_oil_interval)
        `)
        .eq("plate_number", currentTruck.plate_number)
        .single();

      if (error) throw error;

      const nextChangeOdo = truckData.next_change_oil_odometer;
      const interval = truckData.truck_specs?.change_oil_interval || 0;
      
      if (!nextChangeOdo) return;

      const remainingDistance = nextChangeOdo - newOdometer;

      // Create notifications based on remaining distance
      if (remainingDistance < 0) {
        // Overdue - immediate oil change needed
        await supabase.from("notifications").insert([
          {
            type: "error",
            message: `🚨 Truck ${currentTruck.plate_number} needs oil change IMMEDIATELY! Odometer has surpassed the oil change interval.`,
            role: "user",
            plate_number: currentTruck.plate_number,
            created_at: getPhilippinesTimeISO(),
          },
        ]);
      } else if (remainingDistance <= 100) {
        // Need to change oil soon (within 100 km)
        await supabase.from("notifications").insert([
          {
            type: "warning",
            message: `⚠️ Truck ${currentTruck.plate_number} needs oil change soon (within ${remainingDistance} km).`,
            role: "user",
            plate_number: currentTruck.plate_number,
            created_at: getPhilippinesTimeISO(),
          },
        ]);
      } else if (remainingDistance <= 500) {
        // Warning (within 500 km)
        await supabase.from("notifications").insert([
          {
            type: "info",
            message: `ℹ️ Truck ${currentTruck.plate_number} will need oil change in ${remainingDistance} km.`,
            role: "user",
            plate_number: currentTruck.plate_number,
            created_at: getPhilippinesTimeISO(),
          },
        ]);
      }

    } catch (error) {
      console.error("Error creating oil change notifications:", error);
    }
  };

  // Handle modal close with proper cleanup
  const handleModalClose = () => {
    resetStates();
    onClose();
  };

  // Handle cancel button click
  const handleCancelClick = () => {
    resetStates();
    onClose();
  };

  // Render oil change status information
  const renderOilChangeStatus = () => {
    if (!oilChangeInfo) return null;

    const { currentOdometer, nextChangeOdometer, remainingDistance, interval } = oilChangeInfo;

    if (!nextChangeOdometer || !interval) return null;

    let statusColor = "text-green-600";
    let statusMessage = "";

    if (remainingDistance < 0) {
      statusColor = "text-red-600";
      statusMessage = `🚨 OVERDUE: Oil change needed immediately! (${Math.abs(remainingDistance)} km overdue)`;
    } else if (remainingDistance <= 100) {
      statusColor = "text-red-500";
      statusMessage = `⚠️ Oil change needed soon (within ${remainingDistance} km)`;
    } else if (remainingDistance <= 500) {
      statusColor = "text-yellow-600";
      statusMessage = `ℹ️ Oil change in ${remainingDistance} km`;
    } else {
      statusColor = "text-green-600";
      statusMessage = `✅ Next oil change in ${remainingDistance} km`;
    }

    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
        <h4 className="font-semibold text-gray-800 mb-2">Oil Change Status</h4>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Current:</span> {currentOdometer.toLocaleString()} km
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Next Change:</span> {nextChangeOdometer.toLocaleString()} km
        </p>
        <p className={`text-sm font-medium ${statusColor} mt-1`}>
          {statusMessage}
        </p>
      </div>
    );
  };

  // Determine button text based on truck status
  const getDeployButtonText = () => {
    if (currentTruck.status === "Deployed") {
      return isReturning ? "Returning..." : "Return Truck";
    }
    return isDeploying ? "Deploying..." : "Deploy Truck";
  };

  // Determine deploy button style based on truck status
  const getDeployButtonStyle = () => {
    if (currentTruck.status === "Deployed") {
      return isReturning 
        ? "bg-gray-400 cursor-not-allowed" 
        : "bg-green-600 hover:bg-green-700";
    }
    return isDeploying 
      ? "bg-gray-400 cursor-not-allowed" 
      : "bg-blue-600 hover:bg-blue-700";
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button onClick={handleModalClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Truck: {currentTruck.plate_number}
            </h3>

            {/* Show current status */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Current Status:</span>{" "}
                <span className={`font-semibold ${
                  currentTruck.status === "Deployed" ? "text-yellow-600" :
                  currentTruck.status === "Available" ? "text-green-600" :
                  currentTruck.status === "Maintenance" ? "text-red-600" :
                  "text-blue-600"
                }`}>
                  {currentTruck.status}
                </span>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">Driver:</span> {currentTruck.driver || "Not assigned"}
              </p>
            </div>

            {renderOilChangeStatus()}

            {currentTruck.status !== "Deployed" ? (
              <>
                <p className="text-sm text-gray-700 mb-4">
                  Deploy this truck for use. The odometer will be updated when the truck is returned.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelClick}
                    className="px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className={`${getDeployButtonStyle()} text-white px-4 py-2 rounded`}
                  >
                    {getDeployButtonText()}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-700">
                  This truck is currently <strong>Deployed</strong>.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Enter Current Odometer Reading (km)
                  </label>
                  <input
                    type="number"
                    min={currentTruck.current_odometer}
                    value={returnOdometer}
                    onChange={(e) => setReturnOdometer(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-gray-800 placeholder-gray-500"
                    placeholder={`Minimum: ${currentTruck.current_odometer} km`}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Current odometer: {currentTruck.current_odometer?.toLocaleString()} km
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={confirmCancelDeployment}
                    disabled={isCancelling}
                    className={`${
                      isCancelling
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    } text-white px-4 py-2 rounded`}
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Deployment"}
                  </button>
                  <button
                    onClick={handleReturn}
                    disabled={isReturning || !returnOdometer}
                    className={`${getDeployButtonStyle()} text-white px-4 py-2 rounded`}
                  >
                    {getDeployButtonText()}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showConfirmCancel && (
        <ConfirmPopup
          title="Cancel Deployment?"
          message={`Are you sure you want to cancel deployment for ${currentTruck.plate_number}?`}
          onConfirm={handleCancelDeployment}
          onCancel={() => setShowConfirmCancel(false)}
        />
      )}

      {showPopup && (
        <AlertPopup
          message={alertMessage}
          type={alertType}
          onClose={closeAlertPopup}
        />
      )}
    </>
  );
}