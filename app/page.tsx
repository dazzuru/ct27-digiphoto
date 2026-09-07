"use client";

import { useEffect, useRef, useState } from "react";

type Screen = "landing" | "camera" | "preview";

const FRAMES = [
  { src: "./wedding-frame-1.png", name: "Frame 1" },
  { src: "./wedding-frame-2.png", name: "Frame 2" },
  { src: "./wedding-frame-3.png", name: "Frame 3" },
] as const;
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1350;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isChangingFrame, setIsChangingFrame] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoBlobRef = useRef<Blob | null>(null);
  const photoUrlRef = useRef("");
  const basePhotoRef = useRef("");
  const countdownTimerRef = useRef<number | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  async function startCamera(nextFacingMode = facingMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser can’t open the camera. Try Safari or Chrome on your phone.");
      return;
    }

    setIsStarting(true);
    setMessage("");
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 2400 },
        },
      });

      streamRef.current = stream;
      setFacingMode(nextFacingMode);
      setScreen("camera");

      requestAnimationFrame(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          setMessage("Tap the screen, then try opening the camera again.");
        }
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Camera access was blocked. Allow camera access in your browser settings, then try again."
          : "We couldn’t open the camera. Check that another app isn’t using it, then try again.",
      );
      setScreen("landing");
    } finally {
      setIsStarting(false);
    }
  }

  async function switchCamera() {
    if (countdown !== null) return;
    const next = facingMode === "user" ? "environment" : "user";
    await startCamera(next);
  }

  function beginCountdown() {
    if (countdown !== null || !videoRef.current?.videoWidth) return;

    let remaining = 3;
    setCountdown(remaining);
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        capturePhoto();
      }
    }, 1000);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;

    const sourceRatio = video.videoWidth / video.videoHeight;
    const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (sourceRatio > targetRatio) {
      sourceWidth = video.videoHeight * targetRatio;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = video.videoWidth / targetRatio;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }

    context.save();
    if (facingMode === "user") {
      context.translate(OUTPUT_WIDTH, 0);
      context.scale(-1, 1);
    }
    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT,
    );
    context.restore();

    const basePhoto = canvas.toDataURL("image/jpeg", 0.96);
    basePhotoRef.current = basePhoto;
    await renderFramedPhoto(selectedFrameIndex, basePhoto);
    stopCamera();
    setScreen("preview");
  }

  async function renderFramedPhoto(frameIndex: number, baseSource = basePhotoRef.current) {
    const canvas = canvasRef.current;
    if (!canvas || !baseSource) return;

    setIsChangingFrame(true);
    try {
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return;

      const basePhoto = await loadImage(baseSource);
      context.drawImage(basePhoto, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

      try {
        const frame = await loadImage(FRAMES[frameIndex].src);
        context.drawImage(frame, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      } catch {
        // The photo still works if a replaceable frame asset is unavailable.
      }

      const photoBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!photoBlob) return;

      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      const nextPhotoUrl = URL.createObjectURL(photoBlob);
      photoBlobRef.current = photoBlob;
      photoUrlRef.current = nextPhotoUrl;
      setPhotoUrl(nextPhotoUrl);
    } finally {
      setIsChangingFrame(false);
    }
  }

  async function changeFrame() {
    if (countdown !== null || isChangingFrame) return;
    const nextFrameIndex = (selectedFrameIndex + 1) % FRAMES.length;
    setSelectedFrameIndex(nextFrameIndex);
    setMessage("");
    if (screen === "preview") await renderFramedPhoto(nextFrameIndex);
  }

  async function retake() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    setPhotoUrl("");
    photoUrlRef.current = "";
    photoBlobRef.current = null;
    basePhotoRef.current = "";
    setMessage("");
    await startCamera(facingMode);
  }

  async function sharePhoto() {
    const blob = photoBlobRef.current;
    if (!photoUrl || !blob) return;
    const filename = `cocktail-cam-${Date.now()}.jpg`;
    const file = new File([blob], filename, { type: "image/jpeg" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "C&T’s Digital Photobooth" });
        setMessage("Photo ready! Choose Save Image in the share menu to keep it.");
      } catch (error) {
        if (error instanceof DOMException && error.name !== "AbortError") {
          setMessage("Press and hold the photo above, then choose Save to Photos.");
        }
      }
      return;
    }

    const link = document.createElement("a");
    link.href = photoUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage("Photo saved! You can take another whenever you’re ready.");
  }

  return (
    <main className="app-shell">
      <header className="brand" aria-label="C and T’s Digital Photobooth">
        <img className="brand-logo" src="./brand-icon.png" alt="" />
        <span className="brand-title">C&amp;T&apos;s Digital Photobooth</span>
      </header>

      {screen === "landing" && (
        <section className="landing-screen" aria-labelledby="welcome-title">
          <div className="eyebrow">⸜(⸝⸝⸝´꒳`⸝⸝⸝)⸝ 🩵</div>
          <h1 id="welcome-title">Lookin good! Take some pictures ✨</h1>
          <p>Choose a fun frame, take your pic, and save them straight to your phone! Frames designed by Candy 🫰</p>
          <div className="photo-card" aria-hidden="true">
            <div className="photo-card-inner">
              <span className="sparkle sparkle-one">✦</span>
              <span className="heart">♥</span>
              <span className="sparkle sparkle-two">✦</span>
              <span className="photo-card-copy">CHEERS<br /><small>TO LOVE</small></span>
            </div>
          </div>
          <button className="primary-button" onClick={() => startCamera()} disabled={isStarting}>
            <span className="button-icon" aria-hidden="true">●</span>
            {isStarting ? "Opening Camera…" : "Open Camera"}
          </button>
          <p className="privacy-note">
            Allow camera access when prompted. Your photos are never uploaded or stored online.
            <span>For the smoothest experience, use Safari or Chrome.</span>
          </p>
          {message && <p className="status-message" role="status">{message}</p>}
        </section>
      )}

      {screen === "camera" && (
        <section className="camera-screen" aria-label="Camera">
          <div className="camera-stage">
            <video
              ref={videoRef}
              className={`camera-video ${facingMode === "user" ? "mirrored" : ""}`}
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
            />
            <img className="live-frame" src={FRAMES[selectedFrameIndex].src} alt="" />
            {countdown !== null && <div className="countdown" aria-live="assertive">{countdown}</div>}
          </div>
          <div className="camera-controls">
            <button className="round-button" onClick={() => startCamera(facingMode)} aria-label="Restart camera">↻</button>
            <button className="shutter-button" onClick={beginCountdown} disabled={countdown !== null} aria-label="Take photo">
              <span />
            </button>
            <button className="round-button" onClick={switchCamera} disabled={countdown !== null} aria-label="Switch camera">⇄</button>
          </div>
          <p className="camera-label">Tap to start the 3-second timer</p>
          <button className="frame-button" onClick={changeFrame} disabled={countdown !== null}>
            <span aria-hidden="true">▣</span>
            Change Frame · {selectedFrameIndex + 1} of {FRAMES.length}
          </button>
          {message && <p className="status-message" role="status">{message}</p>}
        </section>
      )}

      {screen === "preview" && (
        <section className="preview-screen" aria-labelledby="preview-title">
          <div className="eyebrow">WOWIE! (ﾉ◕ヮ◕)ﾉ✨</div>
          <h1 id="preview-title">Done! Long press the pic to save to your device.</h1>
          <div className="result-frame">
            {photoUrl && <img src={photoUrl} alt="Your framed cocktail cam photo" />}
          </div>
          <div className="preview-actions">
            <button className="secondary-button" onClick={retake}>Retake</button>
            <button className="primary-button" onClick={sharePhoto}>Share Photo</button>
          </div>
          <button className="frame-button preview-frame-button" onClick={changeFrame} disabled={isChangingFrame}>
            <span aria-hidden="true">▣</span>
            {isChangingFrame ? "Changing Frame…" : `Change Frame · ${selectedFrameIndex + 1} of ${FRAMES.length}`}
          </button>
          {message && <p className="status-message" role="status">{message}</p>}
          <p className="save-help">
            Feel free to tag us on Instagram at @terren.lee and @cz.uvu! Thank you for celebrating with us 🫶(´ ε ` )♡
            And don&apos;t forget to stop by our print photobooth at the reception tonight!
          </p>
        </section>
      )}

      <canvas ref={canvasRef} hidden />
    </main>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
