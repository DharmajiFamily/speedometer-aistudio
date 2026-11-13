import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  clamp,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeDriveMode,
  sanitizeRoutePoints,
  sanitizeUnit,
  testFirestoreConnection,
} from '../lib/firebase';
import type { DriveMode, RoutePoint, SpeedUnit, TripLog, VehicleTelemetry } from '../types/telemetry';

export const DEFAULT_VEHICLE_ID = 'charger-01';

export const INITIAL_LOCAL_TELEMETRY: VehicleTelemetry = {
  ownerId: 'local',
  vehicleName: '2023 Charger SRT Hellcat',
  driveMode: 'track',
  unit: 'mph',
  speedMph: 0,
  rpm: 780,
  latitude: 34.052235,
  longitude: -118.243683,
  heading: 0,
  altitudeMeters: 87,
  accuracyMeters: 6,
  peakSpeedMph: 0,
  tripDistanceMiles: 0,
  isTracking: false,
  sourceDevice: 'browser-preview',
  updatedAt: null,
  createdAt: null,
};

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isVerifiedUser: boolean;
  connectionOk: boolean;
  authError: string | null;
  remoteTelemetry: VehicleTelemetry | null;
  vehicleExists: boolean;
  trips: TripLog[];
  lastSyncAt: Date | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
  clearAuthError: () => void;
  signOutUser: () => Promise<void>;
  publishTelemetry: (payload: Omit<VehicleTelemetry, 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSettings: (settings: {
    vehicleName: string;
    driveMode: DriveMode;
    unit: SpeedUnit;
    peakSpeedMph: number;
    tripDistanceMiles: number;
  }) => Promise<void>;
  saveTripLog: (trip: {
    label: string;
    driveMode: DriveMode;
    maxSpeedMph: number;
    avgSpeedMph: number;
    distanceMiles: number;
    durationSeconds: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    routePoints: RoutePoint[];
  }) => Promise<void>;
  deleteTripLog: (tripId: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [connectionOk, setConnectionOk] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [remoteTelemetry, setRemoteTelemetry] = useState<VehicleTelemetry | null>(null);
  const [vehicleExists, setVehicleExists] = useState(false);
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const isVerifiedUser = Boolean(user && user.emailVerified);

  useEffect(() => {
    testFirestoreConnection().then(setConnectionOk);
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser || !currentUser.emailVerified) {
        setRemoteTelemetry(null);
        setVehicleExists(false);
        setTrips([]);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;

    const vehiclePath = `users/${user.uid}/vehicles/${DEFAULT_VEHICLE_ID}`;
    const vehicleRef = doc(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID);

    const unsubVehicle = onSnapshot(
      vehicleRef,
      (snap) => {
        if (!snap.exists()) {
          setVehicleExists(false);
          setRemoteTelemetry(null);
          return;
        }
        const d = snap.data();
        setVehicleExists(true);
        setLastSyncAt(new Date());
        setRemoteTelemetry({
          ownerId: String(d.ownerId ?? user.uid),
          vehicleName: String(d.vehicleName ?? '2023 Charger SRT Hellcat'),
          driveMode: sanitizeDriveMode(String(d.driveMode ?? 'track')),
          unit: sanitizeUnit(String(d.unit ?? 'mph')),
          speedMph: Number(d.speedMph ?? 0),
          rpm: Number(d.rpm ?? 780),
          latitude: Number(d.latitude ?? 34.052235),
          longitude: Number(d.longitude ?? -118.243683),
          heading: Number(d.heading ?? 0),
          altitudeMeters: Number(d.altitudeMeters ?? 0),
          accuracyMeters: Number(d.accuracyMeters ?? 10),
          peakSpeedMph: Number(d.peakSpeedMph ?? 0),
          tripDistanceMiles: Number(d.tripDistanceMiles ?? 0),
          isTracking: Boolean(d.isTracking),
          sourceDevice: String(d.sourceDevice ?? 'android'),
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : null,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, vehiclePath);
      }
    );

    const tripsPath = `users/${user.uid}/vehicles/${DEFAULT_VEHICLE_ID}/trips`;
    const tripsQuery = query(
      collection(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID, 'trips'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsubTrips = onSnapshot(
      tripsQuery,
      (snapshot) => {
        const list: TripLog[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const rawPoints = Array.isArray(d.routePoints) ? d.routePoints : [];
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId ?? user.uid),
            vehicleId: String(d.vehicleId ?? DEFAULT_VEHICLE_ID),
            label: String(d.label ?? 'Drive Session'),
            driveMode: sanitizeDriveMode(String(d.driveMode ?? 'street')),
            maxSpeedMph: Number(d.maxSpeedMph ?? 0),
            avgSpeedMph: Number(d.avgSpeedMph ?? 0),
            distanceMiles: Number(d.distanceMiles ?? 0),
            durationSeconds: Number(d.durationSeconds ?? 0),
            startLat: Number(d.startLat ?? 0),
            startLng: Number(d.startLng ?? 0),
            endLat: Number(d.endLat ?? 0),
            endLng: Number(d.endLng ?? 0),
            routePoints: rawPoints.map((p: { lat?: number; lng?: number }) => ({
              lat: Number(p?.lat ?? 0),
              lng: Number(p?.lng ?? 0),
            })),
            createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
          };
        });
        setTrips(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, tripsPath);
      }
    );

    return () => {
      unsubVehicle();
      unsubTrips();
    };
  }, [authReady, user, isVerifiedUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(msg);
      return false;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with email and password.';
      setAuthError(msg);
      return false;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create account.';
      setAuthError(msg);
      return false;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send verification email.';
      setAuthError(msg);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser });
    return auth.currentUser.emailVerified;
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
  }, []);

  const publishTelemetry = useCallback(
    async (payload: Omit<VehicleTelemetry, 'ownerId' | 'createdAt' | 'updatedAt'>) => {
      if (!user || !user.emailVerified) return;
      const vehiclePath = `users/${user.uid}/vehicles/${DEFAULT_VEHICLE_ID}`;
      const vehicleRef = doc(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID);

      try {
        if (!vehicleExists) {
          await setDoc(vehicleRef, {
            ownerId: user.uid,
            vehicleName: (payload.vehicleName || '2023 Charger SRT Hellcat').slice(0, 64),
            driveMode: sanitizeDriveMode(payload.driveMode),
            unit: sanitizeUnit(payload.unit),
            speedMph: clamp(Number(payload.speedMph), 0, 250),
            rpm: clamp(Number(payload.rpm), 0, 8000),
            latitude: clamp(Number(payload.latitude), -90, 90),
            longitude: clamp(Number(payload.longitude), -180, 180),
            heading: clamp(Number(payload.heading), 0, 360),
            altitudeMeters: clamp(Number(payload.altitudeMeters), -500, 15000),
            accuracyMeters: clamp(Number(payload.accuracyMeters), 0, 5000),
            peakSpeedMph: clamp(Number(payload.peakSpeedMph), 0, 250),
            tripDistanceMiles: clamp(Number(payload.tripDistanceMiles), 0, 100000),
            isTracking: Boolean(payload.isTracking),
            sourceDevice: (payload.sourceDevice || 'android-pwa').slice(0, 32),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(vehicleRef, {
            speedMph: clamp(Number(payload.speedMph), 0, 250),
            rpm: clamp(Number(payload.rpm), 0, 8000),
            latitude: clamp(Number(payload.latitude), -90, 90),
            longitude: clamp(Number(payload.longitude), -180, 180),
            heading: clamp(Number(payload.heading), 0, 360),
            altitudeMeters: clamp(Number(payload.altitudeMeters), -500, 15000),
            accuracyMeters: clamp(Number(payload.accuracyMeters), 0, 5000),
            peakSpeedMph: clamp(Number(payload.peakSpeedMph), 0, 250),
            tripDistanceMiles: clamp(Number(payload.tripDistanceMiles), 0, 100000),
            isTracking: Boolean(payload.isTracking),
            sourceDevice: (payload.sourceDevice || 'android-pwa').slice(0, 32),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, vehicleExists ? OperationType.UPDATE : OperationType.CREATE, vehiclePath);
      }
    },
    [user, vehicleExists]
  );

  const updateSettings = useCallback(
    async (settings: {
      vehicleName: string;
      driveMode: DriveMode;
      unit: SpeedUnit;
      peakSpeedMph: number;
      tripDistanceMiles: number;
    }) => {
      if (!user || !user.emailVerified) return;
      const vehiclePath = `users/${user.uid}/vehicles/${DEFAULT_VEHICLE_ID}`;
      const vehicleRef = doc(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID);

      try {
        if (!vehicleExists) {
          await setDoc(vehicleRef, {
            ...INITIAL_LOCAL_TELEMETRY,
            ownerId: user.uid,
            vehicleName: (settings.vehicleName || '2023 Charger SRT Hellcat').slice(0, 64),
            driveMode: sanitizeDriveMode(settings.driveMode),
            unit: sanitizeUnit(settings.unit),
            peakSpeedMph: clamp(settings.peakSpeedMph, 0, 250),
            tripDistanceMiles: clamp(settings.tripDistanceMiles, 0, 100000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(vehicleRef, {
            vehicleName: (settings.vehicleName || '2023 Charger SRT Hellcat').slice(0, 64),
            driveMode: sanitizeDriveMode(settings.driveMode),
            unit: sanitizeUnit(settings.unit),
            peakSpeedMph: clamp(settings.peakSpeedMph, 0, 250),
            tripDistanceMiles: clamp(settings.tripDistanceMiles, 0, 100000),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, vehiclePath);
      }
    },
    [user, vehicleExists]
  );

  const saveTripLog = useCallback(
    async (trip: {
      label: string;
      driveMode: DriveMode;
      maxSpeedMph: number;
      avgSpeedMph: number;
      distanceMiles: number;
      durationSeconds: number;
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      routePoints: RoutePoint[];
    }) => {
      if (!user || !user.emailVerified) return;
      const tripId = `trip-${Date.now()}`;
      const tripPath = `users/${user.uid}/vehicles/${DEFAULT_VEHICLE_ID}/trips/${tripId}`;
      const vehicleRef = doc(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID);
      const tripRef = doc(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID, 'trips', tripId);

      try {
        if (!vehicleExists) {
          await setDoc(vehicleRef, {
            ...INITIAL_LOCAL_TELEMETRY,
            ownerId: user.uid,
            driveMode: sanitizeDriveMode(trip.driveMode),
            latitude: clamp(trip.endLat, -90, 90),
            longitude: clamp(trip.endLng, -180, 180),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await setDoc(tripRef, {
          ownerId: user.uid,
          vehicleId: DEFAULT_VEHICLE_ID,
          label: (trip.label || 'Drive Session').slice(0, 80),
          driveMode: sanitizeDriveMode(trip.driveMode),
          maxSpeedMph: clamp(trip.maxSpeedMph, 0, 250),
          avgSpeedMph: clamp(trip.avgSpeedMph, 0, 250),
          distanceMiles: clamp(trip.distanceMiles, 0, 10000),
          durationSeconds: clamp(trip.durationSeconds, 0, 864000),
          startLat: clamp(trip.startLat, -90, 90),
          startLng: clamp(trip.startLng, -180, 180),
          endLat: clamp(trip.endLat, -90, 90),
          endLng: clamp(trip.endLng, -180, 180),
          routePoints: sanitizeRoutePoints(trip.routePoints),
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, tripPath);
      }
    },
    [user, vehicleExists]
  );

  const deleteTripLog = useCallback(
    async (tripId: string) => {
      if (!user || !user.emailVerified) return;
      const tripPath = `users/${user.uid}/vehicles/${DEFAULT_VEHICLE_ID}/trips/${tripId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'vehicles', DEFAULT_VEHICLE_ID, 'trips', tripId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, tripPath);
      }
    },
    [user]
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isVerifiedUser,
        connectionOk,
        authError,
        remoteTelemetry,
        vehicleExists,
        trips,
        lastSyncAt,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendVerificationEmail,
        refreshUser,
        clearAuthError,
        signOutUser,
        publishTelemetry,
        updateSettings,
        saveTripLog,
        deleteTripLog,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error('useFirebase must be used inside FirebaseProvider');
  return ctx;
}
