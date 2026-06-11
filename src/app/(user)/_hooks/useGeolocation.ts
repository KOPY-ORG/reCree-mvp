"use client";

import { useState, useCallback } from "react";

export type GeolocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable" | "timeout";

export interface GeolocationCoords {
  lat: number;
  lng: number;
}

export interface UseGeolocationResult {
  coords: GeolocationCoords | null;
  status: GeolocationStatus;
  request: () => void;
}

export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else if (err.code === err.POSITION_UNAVAILABLE) setStatus("unavailable");
        else if (err.code === err.TIMEOUT) setStatus("timeout");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { coords, status, request };
}
