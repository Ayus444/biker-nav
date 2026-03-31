// src/hooks/useNavigation.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { RouteData, RouteStep } from "@/lib/offlineStore";

export interface Position {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useNavigation(route: RouteData | null) {
  const [position, setPosition] = useState<Position | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [distToNext, setDistToNext] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [missedTurn, setMissedTurn] = useState(false);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const watchRef = useRef<number | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.volume = 1.0;
    synthRef.current.speak(u);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  }, []);

  // Find nearest step index to current position
  const findNearestStep = useCallback(
    (pos: Position, steps: RouteStep[], currentIdx: number): number => {
      let best = currentIdx;
      let bestDist = Infinity;
      // Only look ahead (not backward) to avoid re-triggering
      for (let i = currentIdx; i < Math.min(currentIdx + 5, steps.length); i++) {
        const s = steps[i];
        if (!s.location) continue;
        const d = haversine(pos.lat, pos.lng, s.location.lat, s.location.lng);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
    []
  );

  // Check if rider is on the route polyline (within 50m)
  const checkOnRoute = useCallback(
    (pos: Position, coords: [number, number][]): boolean => {
      for (let i = 0; i < coords.length - 1; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[i + 1];
        // Simple: check distance to each segment endpoint
        if (
          haversine(pos.lat, pos.lng, lat1, lng1) < 60 ||
          haversine(pos.lat, pos.lng, lat2, lng2) < 60
        ) {
          return true;
        }
      }
      return false;
    },
    []
  );

  useEffect(() => {
    if (!route) return;

    setStepIndex(0);
    setArrived(false);
    setMissedTurn(false);
    spokenSteps.current.clear();

    // Preload first instruction
    if (route.steps[0]) {
      speak(route.steps[0].voice);
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (geo) => {
        const pos: Position = {
          lat: geo.coords.latitude,
          lng: geo.coords.longitude,
          heading: geo.coords.heading ?? undefined,
          speed: geo.coords.speed ?? undefined,
        };
        setPosition(pos);

        const { steps, coordinates } = route;
        if (!steps.length) return;

        // Check off-route
        const onRoute = checkOnRoute(pos, coordinates);
        setIsOffRoute(!onRoute);

        // Find nearest upcoming step
        setStepIndex((prev) => {
          const nearest = findNearestStep(pos, steps, prev);

          // Update distance to next turn
          const nextStep = steps[nearest];
          if (nextStep?.location) {
            const d = haversine(
              pos.lat,
              pos.lng,
              nextStep.location.lat,
              nextStep.location.lng
            );
            setDistToNext(Math.round(d));

            // Announce at 200m, 100m, 50m
            const thresholds = [200, 100, 50];
            for (const t of thresholds) {
              const key = nearest * 1000 + t;
              if (d < t && d > t - 30 && !spokenSteps.current.has(key)) {
                spokenSteps.current.add(key);
                const dist = `${t} meters`;
                const baseVoice = nextStep.voice.replace(/In .* ,/, `In ${dist},`);
                speak(baseVoice);
                vibrate(100);
              }
            }

            // Detect missed turn: past the step by 80m
            if (d > 80 && nearest < steps.length - 1 && nearest > prev) {
              setMissedTurn(true);
              setTimeout(() => setMissedTurn(false), 4000);
              vibrate([200, 100, 200]);
            }

            // Arrived
            if (nearest === steps.length - 1 && d < 30) {
              setArrived(true);
              speak("You have arrived at your destination!");
              vibrate([300, 100, 300, 100, 300]);
            }
          }

          return nearest;
        });
      },
      (err) => console.warn("Geo error:", err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [route, speak, vibrate, findNearestStep, checkOnRoute]);

  const currentStep: RouteStep | null = route?.steps[stepIndex] ?? null;
  const nextStep: RouteStep | null = route?.steps[stepIndex + 1] ?? null;

  return {
    position,
    stepIndex,
    currentStep,
    nextStep,
    distToNext,
    arrived,
    missedTurn,
    isOffRoute,
    speak,
  };
}
