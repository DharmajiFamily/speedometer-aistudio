import React from 'react';
import { Trash2 } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

interface TripLogsViewProps {
  onOpenAuth: () => void;
}

export const TripLogsView: React.FC<TripLogsViewProps> = ({ onOpenAuth }) => {
  const { user, isVerifiedUser, trips, deleteTripLog } = useFirebase();

  if (!user || !isVerifiedUser) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-[#101218] p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">
          {user && !isVerifiedUser ? 'Verify your email to view trip logs' : 'Sign in to sync and view trip logs'}
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Your saved drives, top speeds, and OpenStreetMap routes sync across your Android phone and Windows
          dashboard via Firebase.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#c81827] text-sm font-semibold text-white transition-colors"
        >
          {user && !isVerifiedUser ? 'Verify Email' : 'Sign In with Email or Google'}
        </button>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-[#101218] p-8 text-center space-y-2">
        <h2 className="text-lg font-semibold text-white">No saved trips yet</h2>
        <p className="text-sm text-zinc-400">
          Run a GPS drive or Test Drive in the Cockpit tab, then select Save Trip to record it to Firestore.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-zinc-800 bg-[#101218] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Saved Drive Sessions</h2>
        <span className="text-xs text-zinc-400 font-mono-tabular">{trips.length} recorded</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-xs text-zinc-400 bg-[#0C0E13]">
            <tr>
              <th className="py-3 px-4 font-medium">Trip</th>
              <th className="py-3 px-4 font-medium">Mode</th>
              <th className="py-3 px-4 font-medium text-right">Peak Speed</th>
              <th className="py-3 px-4 font-medium text-right">Avg Speed</th>
              <th className="py-3 px-4 font-medium text-right">Distance</th>
              <th className="py-3 px-4 font-medium text-right">Duration</th>
              <th className="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium text-zinc-100">{trip.label}</div>
                  <div className="text-xs text-zinc-500 font-mono-tabular">
                    {trip.createdAt ? trip.createdAt.toLocaleString() : 'Just now'}
                  </div>
                </td>
                <td className="py-3 px-4 text-zinc-300 capitalize">{trip.driveMode}</td>
                <td className="py-3 px-4 text-right font-mono-tabular text-[#FB7185]">
                  {Math.round(trip.maxSpeedMph)} MPH
                </td>
                <td className="py-3 px-4 text-right font-mono-tabular text-zinc-200">
                  {Math.round(trip.avgSpeedMph)} MPH
                </td>
                <td className="py-3 px-4 text-right font-mono-tabular text-zinc-200">
                  {trip.distanceMiles.toFixed(2)} mi
                </td>
                <td className="py-3 px-4 text-right font-mono-tabular text-zinc-400">
                  {formatDuration(trip.durationSeconds)}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => deleteTripLog(trip.id)}
                    aria-label={`Delete ${trip.label}`}
                    className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-zinc-400 hover:text-[#FB7185] hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
