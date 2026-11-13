import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Layers, LocateFixed, Navigation, Search, X } from 'lucide-react';
import type { RoutePoint } from '../types/telemetry';

interface TelemetryMapProps {
  latitude: number;
  longitude: number;
  heading: number;
  speedMph: number;
  routePoints: RoutePoint[];
  heightClass?: string;
  label?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface ActiveRoute {
  destinationName: string;
  destination: [number, number];
  distanceMiles: number;
  durationMinutes: number;
}

type MapStyle = 'dark' | 'osm';

export const TelemetryMap: React.FC<TelemetryMapProps> = ({
  latitude,
  longitude,
  heading,
  speedMph,
  routePoints,
  heightClass = 'h-[360px]',
  label = 'OpenStreetMap GPS',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailPolylineRef = useRef<L.Polyline | null>(null);
  const navPolylineRef = useRef<L.Polyline | null>(null);
  const destMarkerRef = useRef<L.CircleMarker | null>(null);

  const [followVehicle, setFollowVehicle] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>('osm');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
    });

    const initialLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const vehicleIcon = L.divIcon({
      className: 'charger-vehicle-marker',
      html: `<div id="charger-arrow" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);transition:transform 0.25s ease-out;">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="rgba(225,29,46,0.25)" />
          <path d="M16 4L25 26L16 21L7 26L16 4Z" fill="#E11D2E" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([latitude, longitude], { icon: vehicleIcon }).addTo(map);
    const trailPolyline = L.polyline([], {
      color: '#E11D2E',
      weight: 4,
      opacity: 0.9,
      lineJoin: 'round',
    }).addTo(map);

    const navPolyline = L.polyline([], {
      color: '#38BDF8',
      weight: 5,
      opacity: 0.85,
      dashArray: '8 6',
      lineJoin: 'round',
    }).addTo(map);

    map.on('dragstart', () => setFollowVehicle(false));

    mapRef.current = map;
    tileLayerRef.current = initialLayer;
    markerRef.current = marker;
    trailPolylineRef.current = trailPolyline;
    navPolylineRef.current = navPolyline;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerRef.current = null;
      trailPolylineRef.current = null;
      navPolylineRef.current = null;
      destMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const url =
      mapStyle === 'osm'
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const attribution =
      mapStyle === 'osm'
        ? '&copy; OpenStreetMap contributors'
        : '&copy; OpenStreetMap &copy; CARTO';

    tileLayerRef.current = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const trailPolyline = trailPolylineRef.current;
    if (!map || !marker || !trailPolyline) return;

    const pos: [number, number] = [latitude, longitude];
    marker.setLatLng(pos);

    const arrowEl = marker.getElement()?.querySelector('#charger-arrow') as HTMLElement | null;
    if (arrowEl) {
      arrowEl.style.transform = `rotate(${heading}deg)`;
    }

    if (routePoints.length > 0) {
      trailPolyline.setLatLngs(routePoints.map((p): [number, number] => [p.lat, p.lng]));
    } else {
      trailPolyline.setLatLngs([pos]);
    }

    if (followVehicle) {
      map.panTo(pos, { animate: true, duration: 0.45 });
    }
  }, [latitude, longitude, heading, routePoints, followVehicle]);

  const handleRecenter = () => {
    setFollowVehicle(true);
    mapRef.current?.setView([latitude, longitude], 16, { animate: true });
  };

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      setSearchError('Browser geolocation is unavailable.');
      return;
    }
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFollowVehicle(false);
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
      },
      () => {
        setSearchError('Location permission denied. Allow location access to center on you.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error('Search request failed');
      const data = (await res.json()) as SearchResult[];
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError('No matching destinations found.');
      }
    } catch {
      setSearchError('Unable to reach OpenStreetMap search right now.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectDestination = async (item: SearchResult) => {
    const destLat = Number(item.lat);
    const destLng = Number(item.lon);
    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0] || item.display_name);
    setSearchError(null);

    const map = mapRef.current;
    const navLine = navPolylineRef.current;
    if (!map || !navLine) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
    }
    destMarkerRef.current = L.circleMarker([destLat, destLng], {
      radius: 8,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '#38BDF8',
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup(item.display_name.split(',')[0] || 'Destination');

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destLng},${destLat}?overview=full&geometries=geojson`
      );
      if (!res.ok) throw new Error('Routing failed');
      const data = (await res.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        }>;
      };
      const route = data.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        const latLngs: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        navLine.setLatLngs(latLngs);
        setFollowVehicle(false);
        map.fitBounds(navLine.getBounds(), { padding: [48, 48] });
        setActiveRoute({
          destinationName: item.display_name.split(',')[0] || 'Destination',
          destination: [destLat, destLng],
          distanceMiles: route.distance * 0.000621371,
          durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        });
        return;
      }
    } catch {
      // Fallback straight line if OSRM unavailable
    }

    navLine.setLatLngs([
      [latitude, longitude],
      [destLat, destLng],
    ]);
    setFollowVehicle(false);
    map.fitBounds(navLine.getBounds(), { padding: [48, 48] });
    setActiveRoute({
      destinationName: item.display_name.split(',')[0] || 'Destination',
      destination: [destLat, destLng],
      distanceMiles: 0,
      durationMinutes: 0,
    });
  };

  const handleClearRoute = () => {
    setActiveRoute(null);
    setSearchQuery('');
    setSearchResults([]);
    navPolylineRef.current?.setLatLngs([]);
    if (destMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    handleRecenter();
  };

  return (
    <div className="space-y-2.5">
      {/* Destination Search Bar (OpenStreetMap Nominatim + OSRM) */}
      <div className="relative">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination on OpenStreetMap..."
              aria-label="Search destination"
              className="w-full min-h-[42px] rounded-xl border border-zinc-800 bg-[#0E1015] pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="min-h-[42px] px-4 rounded-xl bg-[#E11D2E] hover:bg-[#c81827] disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
          >
            {isSearching ? 'Searching...' : 'Go To'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-[46px] z-30 rounded-xl border border-zinc-700 bg-[#101218] shadow-2xl overflow-hidden divide-y divide-zinc-800">
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectDestination(item)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-zinc-200 hover:bg-zinc-800/80 transition-colors truncate"
              >
                {item.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchError && (
        <div className="text-xs text-amber-300 px-1">{searchError}</div>
      )}

      {activeRoute && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-900/60 bg-sky-950/30 px-3.5 py-2 text-xs text-sky-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Route to {activeRoute.destinationName}</span>
            {activeRoute.distanceMiles > 0 && (
              <>
                <span className="text-sky-400" aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {activeRoute.distanceMiles.toFixed(1)} mi ({activeRoute.durationMinutes} min)
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearRoute}
            className="inline-flex items-center gap-1 text-sky-300 hover:text-white font-medium"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      )}

      {/* Map Viewport */}
      <div className={`relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0B0D12] ${heightClass}`}>
        <div ref={containerRef} className="w-full h-full z-0" />

        {/* Clean Top-Left Telemetry Overlay */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-[#090A0D]/88 backdrop-blur-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200">
          <Navigation className="w-3.5 h-3.5 text-[#E11D2E]" />
          <span className="font-medium">{label}</span>
          <span className="text-zinc-600" aria-hidden="true">·</span>
          <span className="font-mono-tabular text-zinc-400 hidden sm:inline">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
          <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="font-mono-tabular text-zinc-200">{Math.round(speedMph)} MPH</span>
        </div>

        {/* Map Controls (Top-Right) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === 'osm' ? 'dark' : 'osm'))}
            title="Switch between OpenStreetMap Street and Dark Night Map"
            className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-zinc-700 bg-[#090A0D]/90 text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            {mapStyle === 'osm' ? 'OSM' : 'Dark'}
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            title="Center on my current location"
            className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-zinc-700 bg-[#090A0D]/90 text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRecenter}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 ${
              followVehicle
                ? 'bg-[#E11D2E] text-white border-[#E11D2E]'
                : 'bg-[#090A0D]/90 text-zinc-200 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {followVehicle ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>
    </div>
  );
};
