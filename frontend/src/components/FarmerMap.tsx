"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet marker icon asset issues in Next.js
const setupLeafletMarker = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

// Map helper to center dynamically
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Click listener inside react-leaflet context to handle drawing clicks
import { useMapEvents } from "react-leaflet";

function MapClickHandler({ 
  onMapClick, 
  isDrawing 
}: { 
  onMapClick: (lat: number, lng: number) => void;
  isDrawing: boolean;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface FarmerMapProps {
  center: [number, number];
  fields: Array<{
    id: number | string;
    name: string;
    crop_type: string;
    geojson: {
      type: string;
      coordinates: number[][][];
    };
    stressColor: string; // "Green" | "Yellow" | "Red"
  }>;
  selectedFieldId: number | string | null;
  onSelectField: (id: number | string) => void;
  isDrawing: boolean;
  draftPoints: Array<[number, number]>;
  onAddDraftPoint: (lat: number, lng: number) => void;
}

export default function FarmerMap({
  center,
  fields,
  selectedFieldId,
  onSelectField,
  isDrawing,
  draftPoints,
  onAddDraftPoint,
}: FarmerMapProps) {
  
  useEffect(() => {
    setupLeafletMarker();
  }, []);

  // Map stress colors to hex colors
  const getStressHex = (color: string) => {
    switch (color) {
      case "Red": return "#ef4444"; // Severe
      case "Yellow": return "#f59e0b"; // Moderate
      default: return "#10b981"; // Healthy
    }
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-brand-card">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
        style={{ minHeight: "380px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Render Saved Fields Polygons */}
        {fields.map((field) => {
          // GeoJSON coordinates structure is: [[[lng, lat], [lng, lat], ...]]
          const polyCoords = field.geojson.coordinates[0].map(
            (coord) => [coord[1], coord[0]] as [number, number]
          );

          const isSelected = field.id === selectedFieldId;
          const hexColor = getStressHex(field.stressColor);

          return (
            <Polygon
              key={field.id}
              positions={polyCoords}
              pathOptions={{
                color: isSelected ? "#0ea5e9" : hexColor,
                weight: isSelected ? 3 : 2,
                fillColor: hexColor,
                fillOpacity: isSelected ? 0.55 : 0.35,
              }}
              eventHandlers={{
                click: () => onSelectField(field.id),
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900">
                  <h4 className="font-bold text-sm">{field.name}</h4>
                  <p className="text-xs">Crop: <strong>{field.crop_type}</strong></p>
                  <p className="text-xs">Status: <span className="font-semibold" style={{ color: hexColor }}>{field.stressColor} Stress</span></p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Render active drawing line & markers */}
        {isDrawing && draftPoints.length > 0 && (
          <>
            {/* Draw active line connecting clicked points */}
            <Polyline 
              positions={draftPoints} 
              pathOptions={{ color: "#10b981", weight: 3, dashArray: "5, 5" }} 
            />
            {/* If closed, show polygon preview */}
            {draftPoints.length >= 3 && (
              <Polygon 
                positions={draftPoints} 
                pathOptions={{ color: "#10b981", weight: 1, fillColor: "#10b981", fillOpacity: 0.15 }} 
              />
            )}
            {/* Markers on each drawn node */}
            {draftPoints.map((pt, idx) => (
              <Marker key={idx} position={pt}>
                <Popup>
                  <span className="text-slate-900 text-xs">Node {idx + 1}</span>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* Capture drawing click events */}
        <MapClickHandler onMapClick={onAddDraftPoint} isDrawing={isDrawing} />
        
        {/* Dynamic map center driver */}
        <MapController center={center} />
      </MapContainer>
      
      {/* Floating map legend overlays */}
      <div className="absolute bottom-4 right-4 z-[999] glass-panel px-3 py-2 rounded-xl text-xs flex flex-col gap-1.5">
        <span className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider mb-0.5">Crop Stress Legend</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 stress-pulse-green"></span>
          <span className="text-slate-300">Healthy (Green)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 stress-pulse-yellow"></span>
          <span className="text-slate-300">Moderate Stress (Yellow)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 stress-pulse-red"></span>
          <span className="text-slate-300">Severe Stress (Red)</span>
        </div>
      </div>
    </div>
  );
}
