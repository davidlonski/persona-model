import React from 'react';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import type { Reminder } from '@/lib/db/schema';

export function ReminderTable({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white border border-gray-100 rounded-xl shadow-sm">
        No reminders found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50/50">
          <tr>
            <th className="px-6 py-4 text-xs font-semibold text-left text-gray-500 uppercase tracking-wider">Title / What</th>
            <th className="px-6 py-4 text-xs font-semibold text-left text-gray-500 uppercase tracking-wider">Source</th>
            <th className="px-6 py-4 text-xs font-semibold text-left text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="px-6 py-4 text-xs font-semibold text-left text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-semibold text-left text-gray-500 uppercase tracking-wider">Due / Remind At</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {reminders.map((reminder) => (
            <tr key={reminder.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{reminder.what}</div>
                {reminder.who && <div className="text-xs text-gray-500">From: {reminder.who}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-500">—</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-700">{reminder.priority}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={reminder.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {reminder.remindAt ?? reminder.when
                  ? format(
                      new Date(reminder.remindAt ?? reminder.when!),
                      'MMM d, h:mm a',
                    )
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
