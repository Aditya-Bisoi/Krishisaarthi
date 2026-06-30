"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Coordinate list for Government Monitored Agricultural Districts
const DISTRICT_CENTERS: Record<string, [number, number]> = {
  "Cuttack": [20.46, 85.88],
  "Ludhiana": [30.90, 75.85],
  "Nashik": [19.99, 73.78],
  "Vijayawada": [16.50, 80.64],
  "Bathinda": [30.21, 74.94],
};

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface GovernmentMapProps {
  districts: Array<{
    district: string;
    average_water_stress: number;
    field_count: number;
    total_area_hectares: number;
  }>;
  selectedDistrict: string;
  onSelectDistrict: (name: string) => void;
}

export default function GovernmentMap({
  districts,
  selectedDistrict,
  onSelectDistrict,
}: GovernmentMapProps) {
  
  // Calculate map center based on selected district or default to national average center
  const center = DISTRICT_CENTERS[selectedDistrict] || [22.0, 78.0];

  const getStressColor = (stress: number) => {
    if (stress > 65) return "#ef4444"; // Red (High stress)
    if (stress > 35) return "#f59e0b"; // Yellow (Moderate stress)
    return "#10b981"; // Green (Healthy)
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-brand-card">
      <MapContainer
        center={center}
        zoom={6}
        className="w-full h-full"
        style={{ minHeight: "360px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {districts.map((d) => {
          const coords = DISTRICT_CENTERS[d.district];
          if (!coords) return null;

          const color = getStressColor(d.average_water_stress);
          const isSelected = d.district === selectedDistrict;

          return (
            <CircleMarker
              key={d.district}
              center={coords}
              radius={isSelected ? 18 : 12}
              pathOptions={{
                color: isSelected ? "#0ea5e9" : color,
                weight: isSelected ? 3 : 1,
                fillColor: color,
                fillOpacity: 0.65,
              }}
              eventHandlers={{
                click: () => onSelectDistrict(d.district),
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900">
                  <h4 className="font-bold text-sm">{d.district} District</h4>
                  <p className="text-xs">Stress Index: <strong style={{ color }}>{d.average_water_stress}%</strong></p>
                  <p className="text-xs">Monitored Area: <strong>{d.total_area_hectares} Ha</strong></p>
                  <p className="text-xs">Fields: <strong>{d.field_count}</strong></p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <MapController center={center} />
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-[999] glass-panel px-3 py-2 rounded-xl text-xs flex flex-col gap-1 shadow-lg bg-slate-950/90">
        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">District stress Index</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-300">Severe Stress (&gt;65%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Moderate Stress (35-65%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Healthy (&lt;35%)</span>
        </div>
      </div>
    </div>
  );
}
