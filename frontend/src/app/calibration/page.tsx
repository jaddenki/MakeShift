"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { useCamera } from "../CameraContext";

const TOTAL_STEPS = 5;

const OCTAVE_OPTIONS = ["1", "2", "3", "4"];
const NOTE_OPTIONS = ["A0", "C1", "C2", "C3", "C4", "C5"];

function ChevronDown() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertTriangle() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L22 20H2L12 4Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      <line x1="12" y1="11" x2="12" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="18.5" r="1" fill="white" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14.5" stroke="white" strokeWidth="2" />
      <path d="M9 16L13.5 21L23 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex flex-1 items-center" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const circleFilled = stepNum <= current;
        const barFilled = stepNum < current;
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div
              className={`shrink-0 size-[20px] rounded-full border-2 transition-colors duration-200 ${
                circleFilled ? "bg-[#b46eff] border-[#b46eff]" : "bg-[#ded4cb] border-[#ded4cb]"
              }`}
            />
            {i < total - 1 && (
              <div className={`flex-1 h-[10px] transition-colors duration-200 ${barFilled ? "bg-[#b46eff]" : "bg-[#ded4cb]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Calibration() {
  const [step, setStep] = useState(1);

  // Step 1
  const [octaves, setOctaves] = useState("2");
  const [startingNote, setStartingNote] = useState("A0");

  // Step 4 & 5: hand detection
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [fingersShown, setFingersShown] = useState(false);
  const [showingImage, setShowingImage] = useState(false);
  const [step5Success, setStep5Success] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stream } = useCamera();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  function resetInteractiveStepState() {
    setCountdown(null);
    setHasStarted(false);
    setFingersShown(false);
    setShowingImage(false);
    setStep5Success(false);
  }

  function goToAdjacentStep(delta: -1 | 1) {
    resetInteractiveStepState();
    setStep((s) => s + delta);
  }

  // Close help modal on Escape
  useEffect(() => {
    if (!showHelpModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHelpModal(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showHelpModal]);

  function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = canvas.toDataURL("image/png");
    });
  }

  const capture = useCallback(async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvasToImage(canvas);
  }, []);

  async function detectFingers(image: HTMLImageElement) {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task" },
      runningMode: "IMAGE",
      numHands: 2,
    });
    const res = handLandmarker.detect(image);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const points = [4, 8, 12, 16, 20];
    let fingertips = 0;
    if (res.landmarks) {
      for (const hand of res.landmarks) {
        for (const idx of points) {
          const point = hand[idx];
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
          fingertips++;
        }
      }
      if (fingertips > 0) setFingersShown(true);
    }
    setShowingImage(true);
  }

  useEffect(() => {
    if (countdown === null || countdown < 0) return;
    if (countdown === 0) {
      capture().then((image) => {
        if (image) detectFingers(image);
      });
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, capture]);

  const handleStartCountdown = () => {
    setHasStarted(true);
    setCountdown(3);
    setShowingImage(false);
    setFingersShown(false);
  };

  const handleStep5Start = () => {
    setHasStarted(true);
    setTimeout(() => setStep5Success(true), 3000);
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isCalibrated", "true");
    }
    router.push("/");
  };

  const canAdvance = () => {
    if (step === 4) return fingersShown;
    if (step === 5) return step5Success;
    return true;
  };

  const isComplete = step > TOTAL_STEPS;

  // ── Camera overlays per step ──────────────────────────────────────────────
  const renderCameraOverlay = () => {
    if (isComplete) {
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="border-2 border-[#e05c5c] bg-white"
            style={{ width: "55%", height: "22%", transform: "skewX(-8deg)" }}
          />
        </div>
      );
    }

    if (step === 1) return null;

    if (step === 2) {
      const luxOk = true;
      if (!luxOk) {
        return (
          <div className="absolute top-[30px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 px-4 py-2 rounded-full">
            <AlertTriangle />
            <p className="text-white text-[22px] font-sans">Warning: Lighting too dim</p>
          </div>
        );
      }
      return null;
    }

    if (step === 3) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative pointer-events-none" style={{ width: "55%", height: "22%", transform: "skewX(-8deg)" }}>
            <div className="absolute inset-0 border-2 border-[#e05c5c] bg-white/90" />
            {[
              { top: -6, left: -6 },
              { top: -6, right: -6 },
              { bottom: -6, left: -6 },
              { bottom: -6, right: -6 },
            ].map((pos, i) => (
              <div key={i} className="absolute w-3 h-3 rounded-full bg-[#e05c5c]" style={pos} />
            ))}
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            aria-label="Show help"
            className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-[6px] flex items-center justify-center text-black text-[18px] font-bold shadow hover:bg-gray-100 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            ?
          </button>
        </div>
      );
    }

    if (step === 4) {
      const handNotDetected = showingImage && !fingersShown;
      return (
        <>
          {/* Paper outline */}
          <div className="absolute flex items-center justify-center pointer-events-none" style={{ bottom: "18%", left: "10%", right: "10%" }}>
            <div className="relative w-full" style={{ height: 60, transform: "skewX(-8deg)" }}>
              <div className="absolute inset-0 border-2 border-[#e05c5c] bg-white/90" />
              {[20, 28, 36, 44, 50, 58, 66, 72, 80, 88].map((pct, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-[#e05c5c]"
                  style={{ bottom: "100%", left: `${pct}%`, marginBottom: 4 + (i % 3) * 6 }}
                />
              ))}
            </div>
          </div>

          {/* Countdown circle */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-[28px] font-bold">{countdown}</span>
            </div>
          )}

          {/* "Hands above the paper" pill */}
          {hasStarted && !handNotDetected && (
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-5 py-2 rounded-full">
              <span className="text-white text-[18px]">🖐</span>
              <span className="text-white text-[16px] font-sans">Hands above the paper visual goes here</span>
            </div>
          )}

          {/* Warning: hands not detected */}
          {handNotDetected && (
            <div className="absolute top-[30px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 px-4 py-2 rounded-full">
              <AlertTriangle />
              <p className="text-white text-[22px] font-sans">Warning: Hands not detected</p>
            </div>
          )}

          {/* Help button */}
          <button
            onClick={() => setShowHelpModal(true)}
            aria-label="Show help"
            className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-[6px] flex items-center justify-center text-black text-[18px] font-bold shadow hover:bg-gray-100 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            ?
          </button>

        </>
      );
    }

    if (step === 5) {
      return (
        <>
          {/* Paper outline with fingertip dots ON it */}
          <div className="absolute flex items-center justify-center pointer-events-none" style={{ bottom: "18%", left: "10%", right: "10%" }}>
            <div className="relative w-full" style={{ height: 60, transform: "skewX(-8deg)" }}>
              <div className="absolute inset-0 border-2 border-[#e05c5c] bg-white/90" />
              {[15, 22, 32, 42, 54, 62, 70, 78, 86, 92].map((pct, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-[#e05c5c]"
                  style={{ top: "30%", left: `${pct}%` }}
                />
              ))}
            </div>
          </div>

          {/* Countdown */}
          {hasStarted && !step5Success && (
            <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
              <span className="text-white text-[28px] font-bold">3</span>
            </div>
          )}

          {/* "Hands on paper" pill */}
          {hasStarted && !step5Success && (
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-5 py-2 rounded-full">
              <span className="text-white text-[18px]">🖐</span>
              <span className="text-white text-[16px] font-sans">Hands on the paper visual goes here</span>
            </div>
          )}

          {/* Success overlay */}
          {step5Success && (
            <div className="absolute inset-0 flex flex-col items-center justify-start pt-[14%] gap-2 pointer-events-none">
              <div className="flex items-center gap-2">
                <CheckCircle />
                <span className="text-white text-[32px] font-sans">Success!</span>
              </div>
              <p className="text-white text-[18px] font-sans">Click &lsquo;Next Step&rsquo; to Proceed</p>
              <p className="text-white text-[15px] font-sans opacity-80">Click and drag the red dots to manually adjust if needed</p>
            </div>
          )}

          {/* Help button */}
          <button
            onClick={() => setShowHelpModal(true)}
            aria-label="Show help"
            className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-[6px] flex items-center justify-center text-black text-[18px] font-bold shadow hover:bg-gray-100 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            ?
          </button>
        </>
      );
    }

    return null;
  };

  // ── Help modal ────────────────────────────────────────────────────────────
  const renderHelpModal = () => {
    if (!showHelpModal) return null;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="relative w-[88%] max-w-[680px] overflow-hidden rounded-[8px] shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hand-reference.png"
            alt="Hand positioning reference"
            width={680}
            height={382}
            className="w-full block"
            style={{ objectFit: "cover" }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-5 py-3 flex items-center justify-between">
            <p className="text-white text-[18px] font-sans">Position your hands on the paper like this</p>
            <div aria-hidden="true" className="w-8 h-8 bg-white rounded-[4px] flex items-center justify-center text-black text-[15px] font-bold">?</div>
          </div>
          <button
            onClick={() => setShowHelpModal(false)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white text-[22px] font-bold hover:opacity-70 active:scale-[0.97] transition-[opacity,transform] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // ── Bottom bar content per step ───────────────────────────────────────────
  const renderStepContent = () => {
    if (isComplete) {
      return (
        <p className="text-[26px] text-black font-sans">
          Calibration Completed! You are now able to play music and record
        </p>
      );
    }

    if (step === 1) {
      return (
        <div className="flex items-center gap-6">
          <p className="text-[26px] text-black font-sans">
            Step 1: Select # of octaves and starting note
          </p>
          <div className="flex items-end gap-4 shrink-0">
            <div className="flex flex-col gap-1">
              <label htmlFor="octave-count" className="text-[13px] text-black font-sans"># of Octaves</label>
              <div className="relative">
                <select
                  id="octave-count"
                  name="octaveCount"
                  value={octaves}
                  onChange={(e) => setOctaves(e.target.value)}
                  className="border border-[#d9d9d9] rounded-[8px] pl-3 pr-8 py-2 text-[16px] text-[#1e1e1e] bg-white appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
                >
                  {OCTAVE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown /></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="starting-note" className="text-[13px] text-black font-sans">Starting Note</label>
              <div className="relative">
                <select
                  id="starting-note"
                  name="startingNote"
                  value={startingNote}
                  onChange={(e) => setStartingNote(e.target.value)}
                  className="border border-[#d9d9d9] rounded-[8px] pl-3 pr-8 py-2 text-[16px] text-[#1e1e1e] bg-white appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
                >
                  {NOTE_OPTIONS.map((n) => <option key={n}>{n}</option>)}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown /></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex items-center gap-6">
          <p className="text-[26px] text-black font-sans">Step 2: Check your lighting</p>
          <div className="flex gap-8 shrink-0">
            <span className="text-[14px] text-black font-sans">Current Lighting: 783 lux</span>
            <span className="text-[14px] text-black font-sans">Recommended Lighting: &gt;500 lux</span>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return <p className="text-[26px] text-black font-sans">Step 3: Align your paper</p>;
    }

    if (step === 4) {
      return (
        <div className="flex items-center gap-4">
          <p className="text-[26px] text-black font-sans">Step 4: Hover your hands above the paper for 3 seconds</p>
          <button
            onClick={handleStartCountdown}
            className="shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-5 py-2 rounded-[8px] text-[22px] text-black font-sans hover:bg-black/5 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            {hasStarted ? "Restart" : "Start"}
          </button>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="flex items-center gap-4">
          <p className="text-[26px] text-black font-sans">Step 5: Place your hands on the paper for 3 seconds</p>
          {!step5Success && (
            <button
              onClick={handleStep5Start}
              className="shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-5 py-2 rounded-[8px] text-[22px] text-black font-sans hover:bg-black/5 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
            >
              {hasStarted ? "Restart" : "Start"}
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 bg-[#fffdf7] flex flex-col min-h-0 overflow-hidden">
      {/* Main area */}
      <div className="flex flex-1 min-h-0 pt-[clamp(20px,6dvh,115px)] pl-[clamp(20px,4.2vw,61px)] pr-[clamp(12px,3.2vw,47px)]">
        {/* Camera / overlay area */}
        <div className="flex-1 min-h-0 bg-[#090909] relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: showingImage ? "none" : "block" }}
          />
          <canvas
            ref={canvasRef}
            style={{ display: showingImage ? "block" : "none" }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Countdown overlay (full screen, step 4) */}
          {step === 4 && countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
              <span className="text-white text-[150px] font-bold drop-shadow-lg">{countdown}</span>
            </div>
          )}

          {renderCameraOverlay()}
          {renderHelpModal()}
        </div>

        {/* Right sidebar — nav tabs only, no music controls */}
        <div className="w-[267px] relative flex flex-col shrink-0">
          {/* Piano key bars */}
          <div className="absolute left-0 top-[50px] flex flex-col gap-[24px] z-10 pointer-events-none">
            <div className="bg-black h-[46px] w-[140px] rounded-tr-[4px] rounded-br-[4px] shadow-[2px_1px_1px_0px_rgba(0,0,0,0.1)]" />
            <div className="bg-black h-[46px] w-[140px] rounded-tr-[4px] rounded-br-[4px] shadow-[2px_1px_1px_0px_rgba(0,0,0,0.1)]" />
          </div>

          {/* Nav tabs — Calibration active */}
          <div className="flex flex-col">
            <div
              aria-current="page"
              className="border border-black h-[72px] flex items-center justify-end pr-[19px] pl-[100px] rounded-tr-[8px] bg-[#e7d0ff] relative shadow-[inset_0px_4px_0px_0px_rgba(255,255,255,0.25),inset_0px_-15px_17.6px_0px_rgba(53,21,21,0.07)]"
            >
              <span className="text-[20px] text-black font-sans whitespace-nowrap">Calibration</span>
            </div>
            <Link
              href="/tutorial"
              className="-mt-px border border-black h-[72px] flex items-center justify-end pr-[19px] pl-[100px] bg-[#fffdf7] relative shadow-[inset_0px_4px_0px_0px_rgba(255,255,255,0.25),inset_0px_-15px_17.6px_0px_rgba(53,21,21,0.07)] hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
            >
              <span className="text-[20px] text-black font-sans whitespace-nowrap">Tutorial</span>
            </Link>
            <Link
              href="/about"
              className="-mt-px border border-black h-[72px] flex items-center justify-end pr-[19px] pl-[100px] rounded-br-[8px] bg-[#fffdf7] relative shadow-[inset_0px_4px_0px_0px_rgba(255,255,255,0.25),inset_0px_-15px_17.6px_0px_rgba(53,21,21,0.07)] hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
            >
              <span className="text-[20px] text-black font-sans whitespace-nowrap">About</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Step content row */}
      <div className="flex items-center gap-4 shrink-0 pl-[clamp(20px,4.2vw,61px)] pr-[clamp(12px,3.2vw,47px)] pt-[clamp(8px,2dvh,28px)] pb-[clamp(6px,1.5dvh,16px)]">
        {renderStepContent()}
      </div>

      {/* Bottom nav: Prev/Exit | progress bar | Next/Exit */}
      <div className="flex items-center gap-6 shrink-0 pl-[clamp(20px,3.8vw,56px)] pr-[clamp(12px,3.2vw,47px)] pb-[clamp(10px,2.5dvh,30px)]">
        {isComplete ? (
          <Link
            href="/"
            className="shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-6 py-3 rounded-[8px] text-[26px] text-black font-sans whitespace-nowrap hover:bg-black/5 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            Previous Step
          </Link>
        ) : step === 1 ? (
          <Link
            href="/"
            className="shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-6 py-3 rounded-[8px] text-[26px] text-black font-sans whitespace-nowrap hover:bg-black/5 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            Exit Calibration
          </Link>
        ) : (
          <button
            onClick={() => goToAdjacentStep(-1)}
            className="shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-6 py-3 rounded-[8px] text-[26px] text-black font-sans whitespace-nowrap hover:bg-black/5 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            Previous Step
          </button>
        )}

        <ProgressBar total={TOTAL_STEPS} current={isComplete ? TOTAL_STEPS : step} />

        {isComplete ? (
          <button
            onClick={handleComplete}
            className="shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-6 py-3 rounded-[8px] text-[26px] text-black font-sans whitespace-nowrap hover:bg-black/5 active:scale-[0.97] transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1"
          >
            Exit
          </button>
        ) : (
          <button
            onClick={() => goToAdjacentStep(1)}
            disabled={!canAdvance()}
            className={`shrink-0 border-[1.5px] border-black bg-[#fffdf7] px-6 py-3 rounded-[8px] text-[26px] text-black font-sans whitespace-nowrap transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-1 ${
              !canAdvance() ? "opacity-30 cursor-not-allowed" : "hover:bg-black/5 active:scale-[0.97]"
            }`}
          >
            Next Step
          </button>
        )}
      </div>
    </div>
  );
}
