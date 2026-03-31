// src/components/NavHUD.tsx
"use client";
import { TurnArrow } from "./TurnArrow";
import { RouteStep } from "@/lib/offlineStore";
import styles from "./NavHUD.module.css";

interface Props {
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distToNext: number | null;
  distanceText: string;
  durationText: string;
  stepIndex: number;
  totalSteps: number;
  arrived: boolean;
  missedTurn: boolean;
  isOffRoute: boolean;
  offline: boolean;
  onFocusToggle: () => void;
  focusMode: boolean;
  onReset: () => void;
  onSpeak: (text: string) => void;
}

function formatDistShort(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

export function NavHUD({
  currentStep,
  nextStep,
  distToNext,
  distanceText,
  durationText,
  stepIndex,
  totalSteps,
  arrived,
  missedTurn,
  isOffRoute,
  offline,
  onFocusToggle,
  focusMode,
  onReset,
  onSpeak,
}: Props) {
  if (arrived) {
    return (
      <div className={styles.arrivedOverlay}>
        <div className={styles.arrivedIcon}>⬧</div>
        <div className={styles.arrivedText}>ARRIVED</div>
        <button onClick={onReset} className={styles.resetBtn}>NEW ROUTE</button>
      </div>
    );
  }

  return (
    <>
      {/* Alert banners */}
      {missedTurn && (
        <div className={styles.alertBanner}>
          ⚠ MISSED TURN — Recalculating…
        </div>
      )}
      {isOffRoute && !missedTurn && (
        <div className={styles.offRouteBanner}>
          ⚠ OFF ROUTE
        </div>
      )}

      {/* Top HUD: Next Turn */}
      {currentStep && (
        <div className={styles.turnCard}>
          <TurnArrow action={currentStep.action} size={72} />
          <div className={styles.turnInfo}>
            <div className={styles.distBig}>
              {distToNext != null ? formatDistShort(distToNext) : currentStep.distanceText}
            </div>
            <div className={styles.streetName}>
              {currentStep.streetName || "Continue"}
            </div>
          </div>
          <button
            className={styles.speakBtn}
            onClick={() => onSpeak(currentStep.voice)}
            title="Repeat instruction"
          >
            ♪
          </button>
        </div>
      )}

      {/* Next step preview */}
      {nextStep && !focusMode && (
        <div className={styles.nextCard}>
          <span className={styles.nextLabel}>THEN</span>
          <TurnArrow action={nextStep.action} size={22} color="#aaa" />
          <span className={styles.nextStreet}>{nextStep.streetName || "Continue"}</span>
        </div>
      )}

      {/* Bottom bar */}
      {!focusMode && (
        <div className={styles.bottomBar}>
          <div className={styles.stat}>
            <span className={styles.statVal}>{distanceText}</span>
            <span className={styles.statLbl}>TOTAL</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statVal}>{durationText}</span>
            <span className={styles.statLbl}>ETA</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statVal}>{stepIndex + 1}/{totalSteps}</span>
            <span className={styles.statLbl}>STEP</span>
          </div>

          <div className={styles.controls}>
            {offline && <span className={styles.offlineBadge}>OFFLINE</span>}
            <button onClick={onFocusToggle} className={styles.focusBtn}>
              {focusMode ? "⊞" : "⊟"}
            </button>
            <button onClick={onReset} className={styles.resetBtn2}>✕</button>
          </div>
        </div>
      )}

      {/* Focus mode minimal bottom */}
      {focusMode && (
        <div className={styles.focusBar}>
          <button onClick={onFocusToggle} className={styles.focusBtnFull}>⊞ FULL UI</button>
        </div>
      )}
    </>
  );
}
