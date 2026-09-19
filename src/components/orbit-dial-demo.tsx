"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { OrbitDial } from "@/registry/orbit-dial";

import styles from "./orbit-dial-demo.module.css";

export function OrbitDialPreview() {
  return (
    <div className={`not-prose demo-frame ${styles.preview}`}>
      <div className="w-40 max-w-full">
        <OrbitDial label="Intensity" ariaLabel="Preview intensity" defaultValue={64} unit="%" />
      </div>
    </div>
  );
}

export function OrbitDialDemo() {
  const [intensity, setIntensity] = useState(64);

  return (
    <>
      <div className={`not-prose demo-frame ${styles.demo}`}>
        <div className={styles.header}>
          <span>Texture study</span>
          <span>01 / Output</span>
        </div>
        <div className={styles.stage}>
          <OrbitDial
            label="Intensity"
            ariaLabel="Texture intensity"
            value={intensity}
            onValueChange={setIntensity}
            unit="%"
            getValueText={(value) => `${value} percent`}
          />
          <div className={styles.sample}>
            <div className={styles.sampleHeading}>
              <span>Output level</span>
              <span className={styles.readout}>{String(intensity).padStart(2, "0")}%</span>
            </div>
            <div className={styles.dots} aria-hidden="true">
              {Array.from({ length: 96 }, (_, index) => (
                <span
                  key={index}
                  style={{
                    opacity: 0.06 + (intensity / 100) * (0.3 + ((index * 37) % 13) / 18),
                    transform: `scale(${0.25 + (intensity / 100) * (0.45 + ((index * 7) % 11) / 15)})`,
                  }}
                />
              ))}
            </div>
            <div className={styles.sampleBounds}>
              <span>Subtle</span>
              <span>Pronounced</span>
            </div>
            <button type="button" className={styles.reset} onClick={() => setIntensity(64)}>
              <RotateCcw aria-hidden="true" />
              Reset to 64%
            </button>
          </div>
        </div>
        <div className={styles.footer}>
          <span>Drag around the dial</span>
          <span>0 to 100%</span>
        </div>
      </div>
      <p className="demo-caption">
        Turn the dial or use the slider below it. Arrow keys change one step; Home and End jump to the limits.
      </p>
    </>
  );
}
