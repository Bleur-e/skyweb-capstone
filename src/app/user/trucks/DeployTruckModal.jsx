"use client";
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import supabase from "../../../supabaseClient";

export default function DeployTruckModal({ isOpen, onClose, truck, refreshTrucks, currentUser }) {
  const [travelDistance, setTravelDistance] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTravelDistance("");
      setIsDeploying(false);
      setIsReturning(false);
    }
  }, [isOpen]);

  if (!isOpen || !truck) return null;

  // ✍️ Helper for audit log
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

  // 🚛 DEPLOY
const handleDeploy = async () => {
  setIsDeploying(true);

  try {
    // 🧩 Validate travel distance
    const travelDistanceKm = Number(travelDistance);
    if (!travelDistanceKm || travelDistanceKm <= 0) {
      alert("Please enter a valid travel distance (in km).");
      setIsDeploying(false);
      return;
    }

    // 🧩 Validate driver
    if (!truck.driver) {
      alert("No driver assigned to this truck. Please assign a driver first.");
      setIsDeploying(false);
      return;
    }

    // ✅ Get truck info + specs
    const { data: truckData, error: fetchError } = await supabase
      .from("trucks")
      .select(
        "plate_number, current_odometer, last_change_oil_odometer, spec_id, truck_specs(change_oil_interval)"
      )
      .eq("plate_number", truck.plate_number)
      .single();

    if (fetchError) throw fetchError;
    if (!truckData) throw new Error("Truck not found in database.");

    const { current_odometer, last_change_oil_odometer, truck_specs } = truckData;
    const interval = truck_specs?.change_oil_interval || 0;
    const milesSinceChange = current_odometer - last_change_oil_odometer;

    // ⚠️ Oil change validation
    if (milesSinceChange >= interval) {
      alert("⚠️ This truck is overdue for an oil change! Please schedule maintenance before deploying.");
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

    if (milesSinceChange >= interval - 300) {
      alert("⚠️ Warning: Truck is close to needing an oil change.");
      await supabase.from("notifications").insert([
        {
          type: "warning",
          message: `Truck ${truck.plate_number} is close to oil change interval.`,
          role: "user",
        },
      ]);
    }

    // 🧭 Convert KM → Miles before inserting
    const travelDistanceMi = travelDistanceKm * 0.621371;

    // 🚀 Deploy truck
    const { error: deployError } = await supabase.from("truck_deployments").insert([
      {
        plate_number: truck.plate_number,
        driver_id: truck.driver,
        travel_distance: travelDistanceMi, // stored in miles
        deployed_at: new Date().toISOString(),
      },
    ]);

    if (deployError) throw new Error(deployError.message || "Failed to deploy truck.");

    // 🧭 Update truck status
    const { error: updateError } = await supabase
      .from("trucks")
      .update({ status: "Deployed" })
      .eq("plate_number", truck.plate_number);

    if (updateError) throw new Error(updateError.message || "Failed to update truck status.");

    // 🪵 Audit log
    await addAuditLog(
      "Add",
      `Truck ${truck.plate_number} deployed for ${travelDistanceKm} km (${travelDistanceMi.toFixed(
        1
      )} mi).`
    );

    if (typeof refreshTrucks === "function") await refreshTrucks();
    onClose();
  } catch (err) {
    console.error("Deploy error:", err?.message || err);
    alert(`Deployment failed: ${err?.message || "Unknown error"}`);
  } finally {
    setIsDeploying(false);
  }
};


  // 🚚 RETURN
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
        alert("No active deployment found for this truck. Forcing status reset to Available.");
        await supabase
          .from("trucks")
          .update({ status: "Available" })
          .eq("plate_number", truck.plate_number);

        await addAuditLog("Edit", `Truck ${truck.plate_number} reset to Available (no active deployment found).`);
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
        await addAuditLog("Edit", `Truck ${truck.plate_number} already marked as returned. Status reset to Available.`);
        if (typeof refreshTrucks === "function") await refreshTrucks();
        onClose();
        return;
      }

      // Mark returned
      await supabase
        .from("truck_deployments")
        .update({ returned_at: new Date().toISOString() })
        .eq("deployment_id", latest.deployment_id);

      const travelMiles = Number(latest.travel_distance || 0);
      const newOdo = (truck.current_odometer || 0) + travelMiles;

      // Get specs
      const { data: specData, error: specErr } = await supabase
        .from("trucks")
        .select("last_change_oil_odometer, truck_specs(change_oil_interval)")
        .eq("plate_number", truck.plate_number)
        .single();

      if (specErr) throw specErr;

      const { last_change_oil_odometer, truck_specs } = specData;
      const interval = truck_specs?.change_oil_interval || 0;
      const milesSinceChange = newOdo - last_change_oil_odometer;

      // Oil notifications
      if (milesSinceChange >= interval) {
        await supabase.from("notifications").insert([
          {
            type: "warning",
            message: `🚨 Truck ${truck.plate_number} exceeded oil change interval (${newOdo.toFixed(0)} mi).`,
            role: "admin",
          },
          {
            type: "warning",
            message: `🚨 Truck ${truck.plate_number} exceeded oil change interval. Please schedule maintenance.`,
            role: "user",
          },
        ]);
      } else if (milesSinceChange >= interval - 200) {
        await supabase.from("notifications").insert([
          {
            type: "warning",
            message: `⚠️ Truck ${truck.plate_number} nearing oil change (${newOdo.toFixed(0)} mi).`,
            role: "admin",
          },
          {
            type: "warning",
            message: `⚠️ Truck ${truck.plate_number} nearing oil change interval.`,
            role: "user",
          },
        ]);
      }

      // Update truck odometer + status
      await supabase
        .from("trucks")
        .update({ status: "Available", current_odometer: newOdo })
        .eq("plate_number", truck.plate_number);

      // 🪵 Audit log
      const formattedMiles = travelMiles.toFixed(1);
      const formattedKm = (travelMiles / 0.621371).toFixed(1);
      await addAuditLog(
        "Edit",
        `Truck ${truck.plate_number} returned — +${formattedKm} km (${formattedMiles} mi) added.`
      );

      if (typeof refreshTrucks === "function") await refreshTrucks();
      onClose();
    } catch (err) {
      console.error("Return error:", err);
      alert("An error occurred while returning the truck. Check console for details.");
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
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
              value={travelDistance}
              onChange={(e) => setTravelDistance(e.target.value)}
              className="w-full border rounded p-2 mb-4 text-gray-700"
              placeholder="Enter trip distance in kilometers"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded text-gray-700"
              >
                Cancel Deploy
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
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded text-gray-700"
              >
                Cancel
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
  );
}
