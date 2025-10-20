"use client";
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import supabase from "../../../supabaseClient";
import ConfirmPopup from "../../../components/ConfirmPopup";

// 🔔 Reusable Alert Popup
const AlertPopup = ({ message, type = "error", onClose }) => (

<div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-50"> <div className={`bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border-l-8 ${ type === "error" ? "border-red-600" : "border-green-600" }`} > <h3 className={`text-xl font-bold mb-3 ${ type === "error" ? "text-red-600" : "text-green-600" }`} > {type === "error" ? "Error" : "Success"} </h3> <p className="text-gray-700 mb-5">{message}</p> <div className="flex justify-end"> <button onClick={onClose} className={`${ type === "error" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700" } text-white px-4 py-2 rounded-md font-semibold`} > Close </button> </div> </div> </div> );

export default function DeployTruckModal({
isOpen,
onClose,
truck,
refreshTrucks,
currentUser,
}) {
const [travelDistance, setTravelDistance] = useState("");
const [isDeploying, setIsDeploying] = useState(false);
const [isReturning, setIsReturning] = useState(false);
const [isCancelling, setIsCancelling] = useState(false);
const [showConfirmCancel, setShowConfirmCancel] = useState(false);

const [showPopup, setShowPopup] = useState(false);
const [alertMessage, setAlertMessage] = useState("");
const [alertType, setAlertType] = useState("error");

useEffect(() => {
if (!isOpen) {
setTravelDistance("");
setIsDeploying(false);
setIsReturning(false);
setIsCancelling(false);
setShowConfirmCancel(false);
setShowPopup(false);
}
}, [isOpen]);

if (!isOpen || !truck) return null;

const showAlertPopup = (message, type = "error") => {
setAlertMessage(message);
setAlertType(type);
setShowPopup(true);
};

const closeAlertPopup = () => {
setShowPopup(false);
setAlertMessage("");
};

const addAuditLog = async (action, description) => {
if (!currentUser) return;
await supabase.from("audit_logs").insert([
{
user_id: currentUser.id,
role: currentUser.role,
action,
table_name: "truck_deployments",
description,
},
]);
};

// 🚛 DEPLOY (KM only)
const handleDeploy = async () => {
setIsDeploying(true);

try {
  const travelDistanceKm = Number(travelDistance);
  if (!travelDistanceKm || travelDistanceKm <= 0) {
    showAlertPopup("Please enter a valid travel distance (in km).");
    setIsDeploying(false);
    return;
  }

  if (travelDistanceKm > 10000) {
    showAlertPopup("Maximum travel distance allowed is 10,000 km per deployment.");
    setIsDeploying(false);
    return;
  }

  if (!truck.driver) {
    showAlertPopup("No driver assigned to this truck. Please assign a driver first.");
    setIsDeploying(false);
    return;
  }

  const { data: truckData, error: fetchError } = await supabase
    .from("trucks")
    .select(
      "plate_number, current_odometer, last_change_oil_odometer, next_change_oil_odometer, truck_specs(change_oil_interval)"
    )
    .eq("plate_number", truck.plate_number)
    .single();

  if (fetchError) throw fetchError;
  if (!truckData) throw new Error("Truck not found in database.");

  const {
    current_odometer,
    last_change_oil_odometer,
    next_change_oil_odometer,
    truck_specs,
  } = truckData;

  const interval = truck_specs?.change_oil_interval || 0;
  const kmSinceChange = current_odometer - last_change_oil_odometer;
  const projectedOdometer = current_odometer + travelDistanceKm;

  if (projectedOdometer > next_change_oil_odometer) {
    showAlertPopup(
      `⚠️ Deployment exceeds next oil change limit (${next_change_oil_odometer} km). Please schedule maintenance first.`
    );
    setIsDeploying(false);
    return;
  }

  if (kmSinceChange >= interval) {
    showAlertPopup("⚠️ This truck is overdue for an oil change! Please schedule maintenance.");
    await supabase.from("notifications").insert([
      {
        type: "warning",
        message: `Truck ${truck.plate_number} is OVERDUE for oil change.`,
        role: "user",
      },
    ]);
    setIsDeploying(false);
    return;
  }

  if (kmSinceChange >= interval - 300) {
    showAlertPopup("⚠️ Warning: Truck is close to needing an oil change.", "success");
    await supabase.from("notifications").insert([
      {
        type: "warning",
        message: `Truck ${truck.plate_number} is close to oil change interval.`,
        role: "user",
      },
    ]);
  }

  // 🚀 Deploy truck
  const { error: deployError } = await supabase.from("truck_deployments").insert([
    {
      plate_number: truck.plate_number,
      driver_id: truck.driver,
      travel_distance: travelDistanceKm,
      deployed_at: new Date().toISOString(),
    },
  ]);
  if (deployError) throw new Error(deployError.message || "Failed to deploy truck.");

  const { error: updateError } = await supabase
    .from("trucks")
    .update({ status: "Deployed" })
    .eq("plate_number", truck.plate_number);
  if (updateError) throw new Error(updateError.message || "Failed to update truck status.");

  await addAuditLog("Add", `Truck ${truck.plate_number} deployed for ${travelDistanceKm} km.`);
  if (typeof refreshTrucks === "function") await refreshTrucks();
  showAlertPopup(`✅ Truck deployed successfully for ${travelDistanceKm} km.`, "success");
  onClose();
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
    .eq("plate_number", truck.plate_number)
    .order("deployed_at", { ascending: false })
    .limit(1)
    .single();
  if (fetchErr) throw fetchErr;

  if (deployment && !deployment.returned_at) {
    await supabase
      .from("truck_deployments")
      .update({ canceled_at: new Date().toISOString() })
      .eq("deployment_id", deployment.deployment_id);
  }

  await supabase
    .from("trucks")
    .update({ status: "Available" })
    .eq("plate_number", truck.plate_number);

  await addAuditLog(
    "Edit",
    `Deployment for truck ${truck.plate_number} canceled (no odometer added).`
  );

  if (typeof refreshTrucks === "function") await refreshTrucks();
  setShowConfirmCancel(false);
  onClose();
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
  const { data: deployments, error: fetchErr } = await supabase
    .from("truck_deployments")
    .select("*")
    .eq("plate_number", truck.plate_number)
    .order("deployed_at", { ascending: false })
    .limit(1);
  if (fetchErr) throw fetchErr;

  if (!deployments || deployments.length === 0) {
    showAlertPopup("No active deployment found. Resetting to Available.");
    await supabase
      .from("trucks")
      .update({ status: "Available" })
      .eq("plate_number", truck.plate_number);
    await addAuditLog("Edit", `Truck ${truck.plate_number} reset to Available.`);
    if (typeof refreshTrucks === "function") await refreshTrucks();
    onClose();
    return;
  }

  const latest = deployments[0];
  if (latest.returned_at) {
    await supabase
      .from("trucks")
      .update({ status: "Available" })
      .eq("plate_number", truck.plate_number);
    await addAuditLog(
      "Edit",
      `Truck ${truck.plate_number} already marked returned. Reset to Available.`
    );
    if (typeof refreshTrucks === "function") await refreshTrucks();
    onClose();
    return;
  }

  await supabase
    .from("truck_deployments")
    .update({ returned_at: new Date().toISOString() })
    .eq("deployment_id", latest.deployment_id);

  const travelKm = Number(latest.travel_distance || 0);
  const newOdo = (truck.current_odometer || 0) + travelKm;

  await supabase
    .from("trucks")
    .update({ status: "Available", current_odometer: newOdo })
    .eq("plate_number", truck.plate_number);

  await addAuditLog(
    "Edit",
    `Truck ${truck.plate_number} returned — +${travelKm.toFixed(1)} km added.`
  );

  if (typeof refreshTrucks === "function") await refreshTrucks();
  onClose();
} catch (err) {
  console.error("Return error:", err);
  showAlertPopup("An error occurred while returning the truck.");
} finally {
  setIsReturning(false);
}


};

return (
<>
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
<div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
<button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" >
<X size={20} />
</button>

      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        Truck: {truck.plate_number}
      </h3>

      {truck.status !== "Deployed" ? (
        <>
          <label className="block text-sm font-medium text-gray-700">
            Travel distance (in km)
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={travelDistance}
            onChange={(e) => setTravelDistance(e.target.value)}
            className="w-full border rounded p-2 mb-4 text-gray-700"
            placeholder="Enter trip distance (max 10,000 km)"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className={`${
                isDeploying
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white px-4 py-2 rounded`}
            >
              {isDeploying ? "Deploying..." : "Deploy"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-700">
            This truck is currently <strong>Deployed</strong>.
          </p>
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
              disabled={isReturning}
              className={`${
                isReturning
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } text-white px-4 py-2 rounded`}
            >
              {isReturning ? "Processing..." : "Returned"}
            </button>
          </div>
        </>
      )}
    </div>
  </div>

  {showConfirmCancel && (
    <ConfirmPopup
      title="Cancel Deployment?"
      message={`Are you sure you want to cancel deployment for ${truck.plate_number}? This will not add to the odometer.`}
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