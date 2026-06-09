import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Map, Globe, Mountain } from "lucide-react";

interface InteractiveMapProps {
  userGuess: { lat: number; lng: number } | null;
  actualLocation: { lat: number; lng: number } | null;
  onPlaceGuess: (coords: { lat: number; lng: number }) => void;
  disabled?: boolean;
}

export default function InteractiveMap({
  userGuess,
  actualLocation,
  onPlaceGuess,
  disabled = false,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [mapInitialized, setMapInitialized] = useState(false);
  const [currentLayerType, setCurrentLayerType] = useState<"dark" | "satellite" | "topo">("dark");
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet map centered on world
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;
    setMapInitialized(true);

    // Handle map clicks
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      onPlaceGuess({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInitialized(false);
      }
    };
  }, [disabled, onPlaceGuess]);

  // Handle tile layer updates and swaps based on user selection state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapInitialized) return;

    // Remove old layer first to avoid piling tiles over each other.
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    let url = "";
    let attribution = "";
    let maxZoom = 20;

    if (currentLayerType === "satellite") {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      attribution = "Esri Satellite";
    } else if (currentLayerType === "topo") {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
      attribution = "Esri Topography";
    } else {
      url = "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png";
      attribution = "&copy; CARTO";
    }

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom,
      attribution,
    }).addTo(map);

  }, [mapInitialized, currentLayerType]);

  // Sync disabled state of map clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.off("click");
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      onPlaceGuess({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }, [disabled, onPlaceGuess]);

  // Update Markers and Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old items
    if (guessMarkerRef.current) {
      guessMarkerRef.current.remove();
      guessMarkerRef.current = null;
    }
    if (actualMarkerRef.current) {
      actualMarkerRef.current.remove();
      actualMarkerRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Add User Guess marker
    if (userGuess) {
      const guessIcon = L.divIcon({
        className: "custom-guess-marker",
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-3.5 h-3.5 bg-[#f27d26] rounded-full border-2 border-white shadow-lg z-20"></div>
            <div class="absolute w-8 h-8 bg-[#f27d26] rounded-full bg-opacity-20 border-2 border-dashed border-[#f27d26] animate-ping" style="animation-duration: 3s"></div>
            <div class="absolute -top-6 bg-[#f27d26] text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap z-30">MY GUESS</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      guessMarkerRef.current = L.marker([userGuess.lat, userGuess.lng], { icon: guessIcon }).addTo(map);
    }

    // Add Actual/Predicted Location marker
    if (actualLocation) {
      const actualIcon = L.divIcon({
        className: "custom-actual-marker",
        html: `
          <div class="relative flex items-center justify-center w-10 h-10">
            <div class="absolute w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center z-20">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
            <div class="absolute w-10 h-10 bg-red-500 bg-opacity-25 rounded-full border border-red-500 animate-pulse"></div>
            <div class="absolute -top-7 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-30">AI PREDICTION</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      actualMarkerRef.current = L.marker([actualLocation.lat, actualLocation.lng], { icon: actualIcon }).addTo(map);
    }

    // Polyline
    if (userGuess && actualLocation) {
      const latlngs: [number, number][] = [
        [userGuess.lat, userGuess.lng],
        [actualLocation.lat, actualLocation.lng],
      ];

      polylineRef.current = L.polyline(latlngs, {
        color: "#f27d26", // brand-orange 
        weight: 3,
        dashArray: "6, 6",
        opacity: 0.8,
      }).addTo(map);

      // Fit bounds to show both pins
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 8,
        animate: true,
        duration: 1.5,
      });
    } else if (userGuess) {
      // Pan to user guess
      map.setView([userGuess.lat, userGuess.lng], Math.max(map.getZoom(), 4), { animate: true });
    } else if (actualLocation) {
      // Pan to actual location
      map.setView([actualLocation.lat, actualLocation.lng], Math.max(map.getZoom(), 4), { animate: true });
    }
  }, [userGuess, actualLocation]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#222] shadow-xl min-h-[350px]">
      <div ref={mapContainerRef} className="w-full h-full" id="guess-map" />

      {/* Dynamic Map Layer Toggle Console */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1.5" id="layer-selector">
        <div className="flex bg-[#0a0a0a]/95 backdrop-blur-md border border-[#222] p-1 rounded-md shadow-2xl items-center gap-1">
          <button
            onClick={() => setCurrentLayerType("dark")}
            className={`px-2.5 py-1.5 rounded-sm text-[9px] font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 cursor-pointer select-none ${
              currentLayerType === "dark"
                ? "bg-[#f27d26] text-black font-black shadow-[0_0_8px_rgba(242,125,38,0.35)]"
                : "text-[#888] hover:text-[#e0e0e0] hover:bg-[#151515]"
            }`}
            title="Switch to Dark-mode Street Map view"
          >
            <Map className="w-3 h-3" />
            <span className="hidden sm:inline">Dark Street</span>
          </button>
          
          <button
            onClick={() => setCurrentLayerType("satellite")}
            className={`px-2.5 py-1.5 rounded-sm text-[9px] font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 cursor-pointer select-none ${
              currentLayerType === "satellite"
                ? "bg-[#f27d26] text-black font-black shadow-[0_0_8px_rgba(242,125,38,0.35)]"
                : "text-[#888] hover:text-[#e0e0e0] hover:bg-[#151515]"
            }`}
            title="Switch to Esri Satellite Imagery"
          >
            <Globe className="w-3 h-3" />
            <span className="hidden sm:inline">Satellite</span>
          </button>

          <button
            onClick={() => setCurrentLayerType("topo")}
            className={`px-2.5 py-1.5 rounded-sm text-[9px] font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 cursor-pointer select-none ${
              currentLayerType === "topo"
                ? "bg-[#f27d26] text-black font-black shadow-[0_0_8px_rgba(242,125,38,0.35)]"
                : "text-[#888] hover:text-[#e0e0e0] hover:bg-[#151515]"
            }`}
            title="Switch to Esri Topographical Map"
          >
            <Mountain className="w-3 h-3" />
            <span className="hidden sm:inline">Topographic</span>
          </button>
        </div>
      </div>
      
      {!userGuess && !actualLocation && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 border border-[#333] text-[#e0e0e0] py-1.5 px-3.5 rounded-md text-xs font-medium tracking-tight pointer-events-none shadow-2xl z-[1000] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f27d26] animate-ping"></span>
          Click on the map to place your Pin
        </div>
      )}
    </div>
  );
}
