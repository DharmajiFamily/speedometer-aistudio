import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_LOCAL_TELEMETRY, useFirebase } from '../contexts/FirebaseContext';
import type { DriveMode, RoutePoint, SpeedUnit, VehicleTelemetry } from '../types/telemetry';

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function estimateRpmFromSpeed(speedMph: number): number {
  if (speedMph < 0.8) return 760;
  const gearTopSpeeds = [24, 45, 68, 96, 126, 154, 180, 205];
  const gearLowSpeeds = [0, 14, 30, 50, 74, 102, 130, 158];
  let idx = gearTopSpeeds.findIndex((top) => speedMph <= top);
  if (idx === -1) idx = gearTopSpeeds.length - 1;
  const low = gearLowSpeeds[idx];
  const high = gearTopSpeeds[idx];
  const frac = Math.min(1, Math.max(0, (speedMph - low) / Math.max(1, high - low)));
  return Math.round(1800 + frac * 4600);
}

export type TelemetrySourceMode = 'idle' | 'gps' | 'simulator';

export function useVehicleTelemetry() {
  const { user, isVerifiedUser, remoteTelemetry, publishTelemetry, updateSettings, saveTripLog } = useFirebase();

  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(INITIAL_LOCAL_TELEMETRY);
  const [sourceMode, setSourceMode] = useState<TelemetrySourceMode>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
    { lat: INITIAL_LOCAL_TELEMETRY.latitude, lng: INITIAL_LOCAL_TELEMETRY.longitude },
  ]);
  const [targetSimSpeed, setTargetSimSpeed] = useState<number>(65);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const [speedSamples, setSpeedSamples] = useState<number[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const lastSyncMsRef = useRef<number>(0);
  const prevPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const telemetryRef = useRef<VehicleTelemetry>(telemetry);
  const targetSimSpeedRef = useRef<number>(targetSimSpeed);
  const simHeadingAngleRef = useRef<number>(0);

  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  useEffect(() => {
    targetSimSpeedRef.current = targetSimSpeed;
  }, [targetSimSpeed]);

  // Hydrate settings from Firestore when signed in & idle
  useEffect(() => {
    if (remoteTelemetry && sourceMode === 'idle') {
      setTelemetry(remoteTelemetry);
      setRoutePoints((prev) =>
        prev.length <= 1
          ? [{ lat: remoteTelemetry.latitude, lng: remoteTelemetry.longitude }]
          : prev
      );
    }
  }, [remoteTelemetry, sourceMode]);

  const maybeSyncToFirestore = useCallback(
    (next: VehicleTelemetry, force = false) => {
      if (!user || !isVerifiedUser) return;
      const now = Date.now();
      if (!force && now - lastSyncMsRef.current < 1100) return;
      lastSyncMsRef.current = now;
      publishTelemetry({
        vehicleName: next.vehicleName,
        driveMode: next.driveMode,
        unit: next.unit,
        speedMph: next.speedMph,
        rpm: next.rpm,
        latitude: next.latitude,
        longitude: next.longitude,
        heading: next.heading,
        altitudeMeters: next.altitudeMeters,
        accuracyMeters: next.accuracyMeters,
        peakSpeedMph: next.peakSpeedMph,
        tripDistanceMiles: next.tripDistanceMiles,
        isTracking: next.isTracking,
        sourceDevice: next.sourceDevice,
      }).catch((e) => console.error('Telemetry sync error:', e));
    },
    [user, isVerifiedUser, publishTelemetry]
  );

  const stopAll = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      window.clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setSourceMode('idle');
    setTelemetry((prev) => {
      const next = { ...prev, isTracking: false, speedMph: 0, rpm: 760 };
      maybeSyncToFirestore(next, true);
      return next;
    });
  }, [maybeSyncToFirestore]);

  const startGpsTracking = useCallback(async () => {
    stopAll();
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported on this browser. Try Simulator mode.');
      return;
    }

    try {
      const navWithWake = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      if (navWithWake.wakeLock) {
        wakeLockRef.current = await navWithWake.wakeLock.request('screen');
      }
    } catch {
      // Wake lock optional
    }

    setSourceMode('gps');
    setTripStartTime(Date.now());
    setSpeedSamples([]);
    prevPosRef.current = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, altitude, accuracy } = pos.coords;
        const now = pos.timestamp || Date.now();

        let computedMph = 0;
        let deltaDist = 0;
        let computedHeading = telemetryRef.current.heading;

        if (prevPosRef.current) {
          deltaDist = haversineMiles(
            prevPosRef.current.lat,
            prevPosRef.current.lng,
            latitude,
            longitude
          );
          const dtHours = Math.max(0.0001, (now - prevPosRef.current.time) / 3600000);
          if (deltaDist > 0.0008) {
            computedHeading = bearingDeg(
              prevPosRef.current.lat,
              prevPosRef.current.lng,
              latitude,
              longitude
            );
          }
          if (typeof speed === 'number' && !Number.isNaN(speed) && speed >= 0) {
            computedMph = speed * 2.23694;
          } else if (deltaDist > 0.0005) {
            computedMph = Math.min(200, deltaDist / dtHours);
          }
        } else if (typeof speed === 'number' && !Number.isNaN(speed) && speed >= 0) {
          computedMph = speed * 2.23694;
        }

        if (typeof heading === 'number' && !Number.isNaN(heading)) {
          computedHeading = heading;
        }

        prevPosRef.current = { lat: latitude, lng: longitude, time: now };

        setRoutePoints((pts) => {
          const last = pts[pts.length - 1];
          if (!last || haversineMiles(last.lat, last.lng, latitude, longitude) > 0.015) {
            return [...pts.slice(-140), { lat: latitude, lng: longitude }];
          }
          return pts;
        });

        setSpeedSamples((s) => [...s.slice(-240), computedMph]);

        setTelemetry((prev) => {
          const next: VehicleTelemetry = {
            ...prev,
            speedMph: Number(computedMph.toFixed(1)),
            rpm: estimateRpmFromSpeed(computedMph),
            latitude,
            longitude,
            heading: Math.round(computedHeading),
            altitudeMeters: Math.round(altitude ?? prev.altitudeMeters),
            accuracyMeters: Math.round(accuracy ?? 8),
            peakSpeedMph: Number(Math.max(prev.peakSpeedMph, computedMph).toFixed(1)),
            tripDistanceMiles: Number((prev.tripDistanceMiles + deltaDist).toFixed(3)),
            isTracking: true,
            sourceDevice: 'android-gps',
          };
          maybeSyncToFirestore(next);
          return next;
        });
      },
      (err) => {
        setGpsError(err.message || 'Location permission denied or unavailable.');
        stopAll();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }, [stopAll, maybeSyncToFirestore]);

  const startSimulation = useCallback(() => {
    stopAll();
    setGpsError(null);
    setSourceMode('simulator');
    setTripStartTime(Date.now());
    setSpeedSamples([]);

    simIntervalRef.current = window.setInterval(() => {
      const cur = telemetryRef.current;
      const target = targetSimSpeedRef.current;
      const diff = target - cur.speedMph;
      const accel = diff > 0 ? Math.min(diff, 4.2) : Math.max(diff, -5.5);
      const nextSpeed = Math.max(0, Math.min(200, cur.speedMph + accel));

      // Move vehicle along a smooth curving highway path
      const dtHours = 0.25 / 3600;
      const stepMiles = nextSpeed * dtHours;
      simHeadingAngleRef.current = (simHeadingAngleRef.current + 1.4) % 360;
      const heading = (72 + Math.sin((simHeadingAngleRef.current * Math.PI) / 180) * 28 + 360) % 360;
      const rad = (heading * Math.PI) / 180;
      const dLat = (stepMiles / 69.0) * Math.cos(rad);
      const dLng =
        (stepMiles / (69.0 * Math.cos((cur.latitude * Math.PI) / 180))) * Math.sin(rad);

      const nextLat = cur.latitude + dLat;
      const nextLng = cur.longitude + dLng;

      setRoutePoints((pts) => {
        const last = pts[pts.length - 1];
        if (!last || haversineMiles(last.lat, last.lng, nextLat, nextLng) > 0.015) {
          return [...pts.slice(-140), { lat: nextLat, lng: nextLng }];
        }
        return pts;
      });
      setSpeedSamples((s) => [...s.slice(-240), nextSpeed]);

      const next: VehicleTelemetry = {
        ...cur,
        speedMph: Number(nextSpeed.toFixed(1)),
        rpm: estimateRpmFromSpeed(nextSpeed),
        latitude: nextLat,
        longitude: nextLng,
        heading: Math.round(heading),
        accuracyMeters: 3,
        peakSpeedMph: Number(Math.max(cur.peakSpeedMph, nextSpeed).toFixed(1)),
        tripDistanceMiles: Number((cur.tripDistanceMiles + stepMiles).toFixed(3)),
        isTracking: true,
        sourceDevice: 'charger-sim',
      };
      setTelemetry(next);
      maybeSyncToFirestore(next);
    }, 250);
  }, [stopAll, maybeSyncToFirestore]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current !== null) {
        window.clearInterval(simIntervalRef.current);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const setDriveMode = useCallback(
    (driveMode: DriveMode) => {
      setTelemetry((prev) => {
        const next = { ...prev, driveMode };
        if (user && isVerifiedUser) {
          updateSettings({
            vehicleName: next.vehicleName,
            driveMode: next.driveMode,
            unit: next.unit,
            peakSpeedMph: next.peakSpeedMph,
            tripDistanceMiles: next.tripDistanceMiles,
          }).catch(() => {});
        }
        return next;
      });
    },
    [user, isVerifiedUser, updateSettings]
  );

  const setUnit = useCallback(
    (unit: SpeedUnit) => {
      setTelemetry((prev) => {
        const next = { ...prev, unit };
        if (user && isVerifiedUser) {
          updateSettings({
            vehicleName: next.vehicleName,
            driveMode: next.driveMode,
            unit: next.unit,
            peakSpeedMph: next.peakSpeedMph,
            tripDistanceMiles: next.tripDistanceMiles,
          }).catch(() => {});
        }
        return next;
      });
    },
    [user, isVerifiedUser, updateSettings]
  );

  const resetTripStats = useCallback(() => {
    setTelemetry((prev) => {
      const next = { ...prev, peakSpeedMph: 0, tripDistanceMiles: 0 };
      if (user && isVerifiedUser) {
        updateSettings({
          vehicleName: next.vehicleName,
          driveMode: next.driveMode,
          unit: next.unit,
          peakSpeedMph: 0,
          tripDistanceMiles: 0,
        }).catch(() => {});
      }
      return next;
    });
    setRoutePoints([{ lat: telemetryRef.current.latitude, lng: telemetryRef.current.longitude }]);
    setSpeedSamples([]);
    setTripStartTime(Date.now());
  }, [user, isVerifiedUser, updateSettings]);

  const commitTripLog = useCallback(
    async (label: string) => {
      if (!user || !isVerifiedUser) return;
      const cur = telemetryRef.current;
      const durationSeconds = tripStartTime
        ? Math.max(1, Math.round((Date.now() - tripStartTime) / 1000))
        : 60;
      const avgSpeed =
        speedSamples.length > 0
          ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
          : cur.speedMph;
      const firstPt = routePoints[0] ?? { lat: cur.latitude, lng: cur.longitude };

      // Sample down to <= 60 points for Firestore rule bounds
      const stride = Math.max(1, Math.ceil(routePoints.length / 55));
      const sampled = routePoints.filter((_, idx) => idx % stride === 0).slice(0, 60);

      await saveTripLog({
        label: label.trim() || 'Charger Drive Session',
        driveMode: cur.driveMode,
        maxSpeedMph: Number(cur.peakSpeedMph.toFixed(1)),
        avgSpeedMph: Number(avgSpeed.toFixed(1)),
        distanceMiles: Number(cur.tripDistanceMiles.toFixed(2)),
        durationSeconds,
        startLat: firstPt.lat,
        startLng: firstPt.lng,
        endLat: cur.latitude,
        endLng: cur.longitude,
        routePoints: sampled,
      });
    },
    [user, isVerifiedUser, tripStartTime, speedSamples, routePoints, saveTripLog]
  );

  return {
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
  };
}
