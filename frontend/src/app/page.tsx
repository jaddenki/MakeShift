"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCamera } from "./CameraContext";

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ active }: { active?: boolean }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18.5" stroke={active ? "#e05c5c" : "#1e1e1e"} strokeWidth="1.5" />
      <path d="M16 14L28 20L16 26V14Z" fill={active ? "#e05c5c" : "#1e1e1e"} />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18.5" stroke="#1e1e1e" strokeWidth="1.5" />
      <rect x="13" y="13" width="14" height="14" fill="#1e1e1e" />
    </svg>
  );
}

export default function Home() {
  const [metronome, setMetronome] = useState(true);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPath, setExportPath] = useState("~/Downloads");
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream } = useCamera();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCalibrated(localStorage.getItem("isCalibrated") === "true");
    }, 0);
    const handleBeforeUnload = () => {
      localStorage.removeItem("isCalibrated");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handlePlay = () => {
    if (!isCalibrated) return;
    setIsRecording(true);
    setHasRecording(true);
    setRecordingComplete(false);
    setShowExportDialog(false);
  };

  const handleStop = () => {
    if (!isCalibrated) return;
    if (isRecording) {
      setIsRecording(false);
      setRecordingComplete(true);
    }
  };

  const handleDeleteRecording = () => {
    setHasRecording(false);
    setIsRecording(false);
    setRecordingComplete(false);
    setShowExportDialog(false);
  };

  return (
    <div className="flex-1 bg-[#fffdf7] flex flex-col">
      <div className="flex pt-[115px] pl-[61px] pr-[47px]">
        {/* Camera feed — locked to 16:9 */}
        <div className="flex-1 aspect-video bg-[#090909] relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* "Click Calibration to Begin" overlay */}
          {!isCalibrated && (
            <div className="absolute inset-0 flex items-start justify-center pt-[60px] pointer-events-none">
              <p className="text-white text-[32px] font-sans text-center px-8">
                Click &lsquo;Calibration&rsquo; to Begin
              </p>
            </div>
          )}

          {/* Export dialog overlay */}
          {showExportDialog && (
            <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 bg-white rounded-[8px] shadow-lg p-5 w-[380px]">
              <p className="text-[16px] text-black font-sans mb-3">
                Choose where to export the MIDI file to:
              </p>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={exportPath}
                  onChange={(e) => setExportPath(e.target.value)}
                  className="flex-1 border border-[#d9d9d9] rounded-[6px] px-3 py-2 text-[16px] outline-none"
                />
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="border border-black bg-[#fffdf7] px-4 py-2 rounded-[6px] text-[16px] font-sans hover:bg-black/5 transition-colors"
                >
                  Export
                </button>
              </div>
            </div>
          )}

          {/* Recording Completed modal */}
          {recordingComplete && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div
                className="bg-white rounded-[12px] px-16 py-8 shadow-xl cursor-pointer"
                onClick={() => setRecordingComplete(false)}
              >
                <p className="text-[32px] font-bold text-black font-sans">Recording Completed!</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[267px] relative flex flex-col">
          {/* Piano key bars */}
          <div className="absolute left-0 top-[50px] flex flex-col gap-[24px] z-10 pointer-events-none">
            <div className="bg-black h-[46px] w-[140px] rounded-tr-[4px] rounded-br-[4px] shadow-[2px_1px_1px_0px_rgba(0,0,0,0.1)]" />
            <div className="bg-black h-[46px] w-[140px] rounded-tr-[4px] rounded-br-[4px] shadow-[2px_1px_1px_0px_rgba(0,0,0,0.1)]" />
          </div>

          {/* Nav tabs */}
          <div className="flex flex-col">
            <Link
              href="/calibration"
              className="border border-black h-[72px] flex items-center justify-end pr-[19px] pl-[100px] rounded-tr-[8px] bg-[#fffdf7] relative shadow-[inset_0px_4px_0px_0px_rgba(255,255,255,0.25),inset_0px_-15px_17.6px_0px_rgba(53,21,21,0.07)]"
            >
              <span className="text-[20px] text-black font-sans whitespace-nowrap">Calibration</span>
            </Link>
            <Link
              href="/tutorial"
              className="-mt-px border border-black h-[72px] flex items-center justify-end pr-[19px] pl-[100px] bg-[#fffdf7] relative shadow-[inset_0px_4px_0px_0px_rgba(255,255,255,0.25),inset_0px_-15px_17.6px_0px_rgba(53,21,21,0.07)]"
            >
              <span className="text-[20px] text-black font-sans whitespace-nowrap">Tutorial</span>
            </Link>
            <Link
              href="/about"
              className="-mt-px border border-black h-[72px] flex items-center justify-end pr-[19px] pl-[100px] rounded-br-[8px] bg-[#fffdf7] relative shadow-[inset_0px_4px_0px_0px_rgba(255,255,255,0.25),inset_0px_-15px_17.6px_0px_rgba(53,21,21,0.07)]"
            >
              <span className="text-[20px] text-black font-sans whitespace-nowrap">About</span>
            </Link>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-[23px] mt-[42px] pl-[43px]">
            {/* Set Tempo */}
            <div className="flex flex-col gap-2">
              <label className="text-[16px] text-[#1e1e1e] font-sans leading-[1.4]">Set Tempo</label>
              <input
                type="text"
                defaultValue="120 BPM"
                className="border border-[#d9d9d9] rounded-[8px] px-4 py-3 text-[16px] text-[#1e1e1e] bg-white w-[120px] leading-none outline-none"
              />
            </div>

            {/* Time Signature */}
            <div className="flex flex-col gap-2">
              <label className="text-[16px] text-[#1e1e1e] font-sans leading-[1.4]">Time Signature</label>
              <div className="relative w-[120px]">
                <select
                  defaultValue="4/4"
                  className="border border-[#d9d9d9] rounded-[8px] pl-4 pr-8 py-[10px] text-[16px] text-[#1e1e1e] bg-white w-full appearance-none leading-none outline-none cursor-pointer"
                >
                  <option>4/4</option>
                  <option>3/4</option>
                  <option>6/8</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#1e1e1e]">
                  <ChevronDown />
                </div>
              </div>
            </div>

            {/* Metronome toggle */}
            <div className="flex items-center gap-3">
              <span className="text-[16px] text-[#1e1e1e] font-sans leading-[1.4] whitespace-nowrap">Metronome</span>
              <button
                onClick={() => setMetronome(!metronome)}
                className={`relative w-[40px] h-[24px] rounded-full overflow-hidden transition-colors ${metronome ? "bg-[#1e1e1e]" : "bg-[#d9d9d9]"}`}
                aria-label="Toggle metronome"
              >
                <span
                  className={`absolute top-[2px] left-0 w-[20px] h-[20px] rounded-full bg-white shadow transition-transform ${metronome ? "translate-x-[18px]" : "translate-x-[2px]"}`}
                />
              </button>
            </div>

            {/* MIDI Recording controls */}
            {hasRecording && (
              <div className="flex flex-col gap-[12px] mt-[6px]">
                <button
                  onClick={() => setShowExportDialog(!showExportDialog)}
                  className="border border-black bg-[#fffdf7] px-4 py-[10px] rounded-[8px] text-[15px] text-black font-sans whitespace-nowrap hover:bg-black/5 transition-colors text-left"
                >
                  Export .MIDI Recording
                </button>
                <button
                  onClick={handleDeleteRecording}
                  className="border border-[#e05c5c] bg-[#fffdf7] px-4 py-[10px] rounded-[8px] text-[15px] text-[#e05c5c] font-sans whitespace-nowrap hover:bg-red-50 transition-colors text-left"
                >
                  Delete .MIDI Recording
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Listen to Recording (left) + Play/Stop (center) */}
      <div className="flex items-center pl-[61px] pr-[47px] pb-[36px] pt-[24px]">
        {/* Camera-width area: listen button left, play/stop centered */}
        <div className="flex-1 relative flex items-center justify-center gap-[27px]">
          {hasRecording && (
            <button className="absolute left-0 border-[1.5px] border-black bg-[#fffdf7] px-5 py-2 rounded-[8px] text-[18px] text-black font-sans hover:bg-black/5 transition-colors">
              Listen to Recording
            </button>
          )}
          <button
            onClick={handlePlay}
            aria-label="Play"
            disabled={!isCalibrated}
            className={`transition-opacity ${!isCalibrated ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
          >
            <PlayIcon active={isRecording} />
          </button>
          <button
            onClick={handleStop}
            aria-label="Stop"
            disabled={!isCalibrated}
            className={`transition-opacity ${!isCalibrated ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
          >
            <StopIcon />
          </button>
        </div>
        {/* Sidebar spacer */}
        <div className="w-[267px]" />
      </div>
    </div>
  );
}
