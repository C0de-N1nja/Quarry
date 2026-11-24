'use client';

import React, { useEffect, useRef } from 'react';
import { useQuarry } from '../context/QuarryContext';
import L from 'leaflet';

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  const { searchResult, selectedId, selectBusiness } = useQuarry();

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = searchResult?.center || [30.2672, -97.7431];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    // Dark-mode OpenStreetMap tiles with custom filter defined in globals.css
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // ResizeObserver to invalidateSize() as explicitly required by Quarry spec
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Markers and Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !searchResult) return;

    markersLayer.clearLayers();

    const center = searchResult.center || [30.2672, -97.7431];
    map.setView(center, 12, { animate: true });

    // Draw radius boundary circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }
    const radiusMeters = (searchResult.radiusKm || 15) * 1000;
    radiusCircleRef.current = L.circle(center, {
      radius: radiusMeters,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.04,
      weight: 1,
      dashArray: '4, 8'
    }).addTo(map);

    // Render Circle Markers: Selected (#10b981, r=10), Competitors (#f59e0b, r=8), Others (#e5e5e5, r=6)
    searchResult.businesses.forEach((b, idx) => {
      const lat = b.latitude || b.lat || center[0] + (Math.sin(idx) * 0.04);
      const lng = b.longitude || b.lng || center[1] + (Math.cos(idx) * 0.04);

      const isSelected = b.id === selectedId;
      const isTopRanked = (b.rating || 0) >= 4.7 && (b.reviews_count || 0) > 30;

      let color = '#e5e5e5';
      let radius = 6;
      let fillOpacity = 0.8;

      if (isSelected) {
        color = '#10b981';
        radius = 10;
        fillOpacity = 1;
      } else if (isTopRanked) {
        color = '#f59e0b';
        radius = 8;
        fillOpacity = 0.9;
      }

      const marker = L.circleMarker([lat, lng], {
        radius,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity
      });

      marker.bindTooltip(`<strong>${b.business_name}</strong><br/>${b.rating}★ (${b.reviews_count} reviews)`, {
        className: 'quarry-map-tooltip',
        direction: 'top',
        offset: [0, -6]
      });

      marker.on('click', () => {
        selectBusiness(b.id);
      });

      markersLayer.addLayer(marker);
    });
  }, [searchResult, selectedId, selectBusiness]);

  return (
    <div className="relative w-full h-[290px] rounded-2xl overflow-hidden border border-[#171717] shadow-xl bg-[#0c0c0c]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom-left floating legend pill (z-[400], backdrop-blur) as specified in PDF */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#050505]/85 border border-[#1c1c1c] backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-3 text-[11px] font-mono shadow-2xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-sm shadow-emerald-500/50" />
          <span className="text-[#cfcfcf]">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />
          <span className="text-[#8a8a8a]">Competitor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e5e5e5] inline-block" />
          <span className="text-[#7e7e7e]">Others</span>
        </div>
      </div>
    </div>
  );
}
