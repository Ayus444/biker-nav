"use client";
import { useState, useEffect, Suspense, lazy } from "react";
import { SearchPanel } from "@/components/SearchPanel";
import { NavHUD } from "@/components/NavHUD";
import { useRoute } from "@/hooks/useRoute";
import { useNavigation } from "@/hooks/useNavigation";
import styles from "./page.module.css";

const NavMap = lazy(() => import("@/components/NavMap"));

export default function Home() {
  const { route, loading, error, offline, fetchRoute, setRoute } = useRoute();
  const { position, stepIndex, currentStep, nextStep, distToNext, arrived, missedTurn, isOffRoute, speak } =
    useNavigation(route);
  const [focusMode, setFocusMode] = useState(false);
  const [swReady, setSwReady] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => setSwReady(true))
        .catch(() => {});
    }
  }, []);

  const handleReset = () => {
    setRoute(null);
    setFocusMode(false);
  };

  const isNavigating = !!route;

  return (
    <main className={styles.main}>
      {/* Map always rendered underneath */}
      <div className={styles.mapContainer}>
        <Suspense fallback={<div className={styles.mapLoader}>Loading map…</div>}>
          <NavMap route={route} position={position} focusMode={focusMode} />
        </Suspense>
      </div>

      {/* Overlay: Search or HUD */}
      {!isNavigating ? (
        <div className={styles.searchOverlay}>
          <SearchPanel onRoute={fetchRoute} loading={loading} error={error} />
          {swReady && (
            <p className={styles.offlineReady}>✓ Offline-ready</p>
          )}
        </div>
      ) : (
        <NavHUD
          currentStep={currentStep}
          nextStep={nextStep}
          distToNext={distToNext}
          distanceText={route.distanceText}
          durationText={route.durationText}
          stepIndex={stepIndex}
          totalSteps={route.steps.length}
          arrived={arrived}
          missedTurn={missedTurn}
          isOffRoute={isOffRoute}
          offline={offline}
          onFocusToggle={() => setFocusMode((f) => !f)}
          focusMode={focusMode}
          onReset={handleReset}
          onSpeak={speak}
        />
      )}
    </main>
  );
}
