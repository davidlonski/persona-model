"use client";

import React, { useState, useEffect } from 'react';
import { ReminderTable } from '@/components/ReminderTable';

export default function DashboardPage() {
  const [reminders, setReminders] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, [status]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/reminders?status=${status}`);
      const json = await res.json();
      if (json.success) {
        setReminders(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleRunPipeline = async () => {
    setTriggering(true);
    try {
      await fetch('/api/pipeline/run', { method: 'POST' });
      await fetchReminders();
    } catch (e) {
      console.error(e);
    }
    setTriggering(false);
  };

  const handleDeliverNow = async () => {
    setTriggering(true);
    try {
      await fetch('/api/deliver/run', { method: 'POST' });
      await fetchReminders();
    } catch (e) {
      console.error(e);
    }
    setTriggering(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">PersonaModel Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and orchestrate your AI-driven reminders.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRunPipeline}
              disabled={triggering}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              Run Pipeline
            </button>
            <button
              onClick={handleDeliverNow}
              disabled={triggering}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              Deliver Now
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-2 border-b border-gray-200 pb-px">
          {['all', 'pending', 'sent', 'snoozed', 'dismissed'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                status === tab 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <ReminderTable reminders={reminders} />
          )}
        </div>
      </div>
    </div>
  );
}
