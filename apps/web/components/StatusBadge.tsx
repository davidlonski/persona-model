import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-gray-100 text-gray-800 border-gray-200";
  
  if (status === "pending" || status === "active") colorClass = "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (status === "completed" || status === "done") colorClass = "bg-green-50 text-green-800 border-green-200";
  if (status === "cancelled" || status === "dismissed") colorClass = "bg-red-50 text-red-800 border-red-200";
  if (status === "snoozed") colorClass = "bg-blue-50 text-blue-800 border-blue-200";
  if (status === "sent") colorClass = "bg-purple-50 text-purple-800 border-purple-200";

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
}
