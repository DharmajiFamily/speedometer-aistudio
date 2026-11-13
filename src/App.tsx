import React, { useState } from 'react';
import {
  BookmarkPlus,
  Code2,
  Download,
  Gauge,
  History,
  Laptop,
  Navigation,
  Play,
  RotateCcw,
  Square,
  WifiOff,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { CodeExportView } from './components/CodeExportView';
import { DodgeChargerSpeedometer } from './components/DodgeChargerSpeedometer';
import { TelemetryMap } from './components/TelemetryMap';
import { TripLogsView } from './components/TripLogsView';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import { useVehicleTelemetry } from './hooks/useVehicleTelemetry';
import type { DriveMode, SpeedUnit } from './types/telemetry';

type ActiveView = 'cockpit' | 'windows' | 'trips' | 'export';

const CockpitApp: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('cockpit');
  const [tripLabel, setTripLabel] = useState('Evening Run');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const { user, authReady, isVerifiedUser, remoteTelemetry, lastSyncAt, signOutUser } =
    useFirebase();
  const {
    telemetry,
    sourceMode,
    gpsError,
    routePoints,
    targetSimSpeed,
    setTargetSimSpeed,
    startGpsTracking,
    startSimulation,
    stopAll,
    setDriveMode,
    setUnit,
    resetTripStats,
    commitTripLog,
  } = useVehicleTelemetry();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const windowsTelemetry =
    sourceMode === 'idle' && remoteTelemetry ? remoteTelemetry : telemetry;

  const handleSaveTrip = async () => {
    if (!user || !isVerifiedUser) return;
    await commitTripLog(tripLabel);
    setSavedNotice('Trip saved to Firestore');
    setTimeout(() => setSavedNotice(null), 2400);
  };

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'cockpit', label: 'Cockpit', icon: <Gauge className="w-5 h-5" /> },
    { id: 'windows', label: 'Windows Map', icon: <Laptop className="w-5 h-5" /> },
    { id: 'trips', label: 'Trip Logs', icon: <History className="w-5 h-5" /> },
    { id: 'export', label: 'Export Code', icon: <Code2 className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col pb-20 md:pb-6">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/90 bg-[#090A0D]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('cockpit')}
            className="font-display text-2xl font-extrabold tracking-wide text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            CHARGER<span className="text-[#E11D2E]">LINK</span>
          </button>

          {/* Zone 2: Single-line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeView === item.id
                    ? 'text-white border-[#E11D2E]'
                    : 'text-zinc-400 border-transparent hover:text-zinc-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {!authReady ? (
              <span className="text-xs text-zinc-500 whitespace-nowrap">Connecting</span>
            ) : user ? (
              <button
                type="button"
                onClick={() => (isVerifiedUser ? signOutUser() : setAuthModalOpen(true))}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-100 transition-colors whitespace-nowrap shrink-0"
              >
                {isVerifiedUser
                  ? `Sign Out · ${user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}`
                  : 'Verify Email'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#E11D2E] hover:bg-[#c81827] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        {user && !isVerifiedUser && (
          <div className="mb-5 rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-100">
            <span>
              Your account ({user.email}) needs email verification before Firestore sync is unlocked.
            </span>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="min-h-[34px] px-3.5 rounded-lg bg-[#E11D2E] hover:bg-[#c81827] font-semibold text-white whitespace-nowrap"
            >
              Verify Email
            </button>
          </div>
        )}

        {activeView === 'cockpit' && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left / Center Primary Anchor: Dodge Charger Custom Speedometer + Controls */}
            <section className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-[#0E1015] p-5 sm:p-6 flex flex-col items-center space-y-5">
              {/* Unboxed Metadata Bar */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-200">{telemetry.vehicleName}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {sourceMode === 'gps'
                      ? 'Android GPS Active'
                      : sourceMode === 'simulator'
                      ? 'Test Drive Active'
                      : 'Standby'}
                  </span>
                </div>
                <div className="font-mono-tabular">
                  {isVerifiedUser
                    ? lastSyncAt
                      ? `Synced ${lastSyncAt.toLocaleTimeString()}`
                      : 'Firebase Ready'
                    : 'Local Preview'}
                </div>
              </div>

              {/* Hero Dodge Charger Speedometer */}
              <DodgeChargerSpeedometer
                speedMph={telemetry.speedMph}
                rpm={telemetry.rpm}
                peakSpeedMph={telemetry.peakSpeedMph}
                tripDistanceMiles={telemetry.tripDistanceMiles}
                heading={telemetry.heading}
                driveMode={telemetry.driveMode}
                unit={telemetry.unit}
                isTracking={telemetry.isTracking}
              />

              {/* Mode & Unit Segmented Controls */}
              <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090A0D] border border-zinc-800">
                  {(['street', 'sport', 'track'] as DriveMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDriveMode(mode)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 ${
                        telemetry.driveMode === mode
                          ? 'bg-[#E11D2E] text-white'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090A0D] border border-zinc-800">
                  {(['mph', 'kmh'] as SpeedUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-semibold uppercase transition-colors whitespace-nowrap shrink-0 ${
                        telemetry.unit === u
                          ? 'bg-zinc-100 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary GPS & Simulator Controls */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={startGpsTracking}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                    sourceMode === 'gps'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#E11D2E] hover:bg-[#c81827] text-white'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  {sourceMode === 'gps' ? 'GPS Streaming' : 'Start Live GPS'}
                </button>

                <button
                  type="button"
                  onClick={startSimulation}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-colors whitespace-nowrap ${
                    sourceMode === 'simulator'
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  {sourceMode === 'simulator' ? 'Simulating' : 'Test Drive'}
                </button>

                <button
                  type="button"
                  onClick={stopAll}
                  disabled={sourceMode === 'idle'}
                  className="col-span-2 sm:col-span-1 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-800 bg-[#090A0D] text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </div>

              {/* Interactive Throttle Control when Simulating */}
              {sourceMode === 'simulator' && (
                <div className="w-full rounded-xl border border-zinc-800 bg-[#090A0D] p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">Test Throttle Target</span>
                    <span className="font-mono-tabular font-bold text-[#FB7185]">
                      {targetSimSpeed} MPH
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={targetSimSpeed}
                    onChange={(e) => setTargetSimSpeed(Number(e.target.value))}
                    className="w-full accent-[#E11D2E] cursor-pointer"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {[0, 45, 75, 120, 165].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTargetSimSpeed(preset)}
                        className="flex-1 min-h-[34px] rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono-tabular text-zinc-300"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {gpsError && (
                <div className="w-full rounded-lg border border-amber-800/60 bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-200">
                  {gpsError}
                </div>
              )}

              {/* Save / Reset Trip & Install Android App */}
              <div className="w-full pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={tripLabel}
                    onChange={(e) => setTripLabel(e.target.value)}
                    maxLength={60}
                    placeholder="Trip label"
                    aria-label="Trip label"
                    className="flex-1 min-h-[40px] rounded-lg border border-zinc-800 bg-[#090A0D] px-3 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTrip}
                    disabled={!isVerifiedUser}
                    title={isVerifiedUser ? 'Save trip to Firebase' : 'Sign in with a verified email to save trips'}
                    className="min-h-[40px] px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs font-medium text-zinc-100 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save Trip
                  </button>
                  <button
                    type="button"
                    onClick={resetTripStats}
                    aria-label="Reset trip odometer"
                    className="min-h-[40px] min-w-[40px] rounded-lg border border-zinc-800 bg-[#090A0D] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isInstalled && (isInstallable || isIOS) && (
                  <button
                    type="button"
                    onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install Android App
                  </button>
                )}
              </div>

              {savedNotice && (
                <div className="w-full text-xs text-emerald-400 font-medium">{savedNotice}</div>
              )}
            </section>

            {/* Right Panel: Companion Live GPS Map + Quick Telemetry Stats */}
            <section className="lg:col-span-6 space-y-4">
              <TelemetryMap
                latitude={telemetry.latitude}
                longitude={telemetry.longitude}
                heading={telemetry.heading}
                speedMph={telemetry.speedMph}
                routePoints={routePoints}
                heightClass="h-[380px] sm:h-[440px]"
                label="OpenStreetMap GPS"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Engine RPM', value: `${Math.round(telemetry.rpm)}` },
                  { label: 'Peak Speed', value: `${Math.round(telemetry.peakSpeedMph)} MPH` },
                  { label: 'Trip Distance', value: `${telemetry.tripDistanceMiles.toFixed(2)} mi` },
                  { label: 'GPS Accuracy', value: `±${Math.round(telemetry.accuracyMeters)} m` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-zinc-800 bg-[#0E1015] px-4 py-3"
                  >
                    <div className="text-xs text-zinc-400">{stat.label}</div>
                    <div className="mt-1 text-lg font-bold font-mono-tabular text-zinc-100">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {!isVerifiedUser && (
                <div className="rounded-xl border border-zinc-800 bg-[#0E1015] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    Sign in with Email &amp; Password (or Google) on your phone and Windows PC to stream this
                    speedometer and OpenStreetMap location live through Firebase.
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="min-h-[38px] px-4 py-2 rounded-lg bg-[#E11D2E] hover:bg-[#c81827] text-xs font-semibold text-white whitespace-nowrap shrink-0"
                  >
                    Connect Firebase
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeView === 'windows' && (
          <div className="grid gap-6 lg:grid-cols-12 items-stretch">
            {/* Windows Live Map (Main 7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <TelemetryMap
                latitude={windowsTelemetry.latitude}
                longitude={windowsTelemetry.longitude}
                heading={windowsTelemetry.heading}
                speedMph={windowsTelemetry.speedMph}
                routePoints={routePoints}
                heightClass="h-[420px] lg:h-[520px]"
                label="Windows Live Sync Map"
              />
            </div>

            {/* Windows Mirrored Charger Cluster (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#0E1015] p-6 flex flex-col items-center justify-between space-y-5">
              <div className="w-full flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-100">{windowsTelemetry.vehicleName}</span>
                <span className="font-mono-tabular">
                  {isVerifiedUser
                    ? remoteTelemetry
                      ? `Live · ${windowsTelemetry.sourceDevice}`
                      : 'Waiting for phone'
                    : 'Local Preview'}
                </span>
              </div>

              <DodgeChargerSpeedometer
                speedMph={windowsTelemetry.speedMph}
                rpm={windowsTelemetry.rpm}
                peakSpeedMph={windowsTelemetry.peakSpeedMph}
                tripDistanceMiles={windowsTelemetry.tripDistanceMiles}
                heading={windowsTelemetry.heading}
                driveMode={windowsTelemetry.driveMode}
                unit={windowsTelemetry.unit}
                isTracking={windowsTelemetry.isTracking}
                compact
              />

              <div className="w-full grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4 text-xs">
                <div>
                  <span className="text-zinc-500">Coordinates</span>
                  <div className="mt-1 font-mono-tabular text-zinc-200">
                    {windowsTelemetry.latitude.toFixed(5)}, {windowsTelemetry.longitude.toFixed(5)}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Heading &amp; Altitude</span>
                  <div className="mt-1 font-mono-tabular text-zinc-200">
                    {Math.round(windowsTelemetry.heading)}° · {Math.round(windowsTelemetry.altitudeMeters)} m
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'trips' && <TripLogsView onOpenAuth={() => setAuthModalOpen(true)} />}

        {activeView === 'export' && <CodeExportView />}
      </main>

      {/* Mobile Bottom Thumb Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-[#090A0D]/95 backdrop-blur-md grid grid-cols-4 h-16"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-medium transition-colors ${
              activeView === item.id ? 'text-[#E11D2E]' : 'text-zinc-400'
            }`}
          >
            {item.icon}
            <span>{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
          <WifiOff className="w-4 h-4" />
          Offline — Cached cockpit active
        </div>
      )}

      {/* Auth Modal (Email/Password + Google) */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#101218] p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Install on iPhone / Android</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Tap your browser&apos;s Share or Menu button and choose <strong>Add to Home Screen</strong> to
              install ChargerLink as a full-screen cockpit app.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[42px] rounded-lg bg-[#E11D2E] text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <FirebaseProvider>
      <CockpitApp />
    </FirebaseProvider>
  );
}
