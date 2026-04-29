import { useEffect, useRef, useState } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import { OPENING_VIDEO_KEY } from "@/lib/config";

const queryClient = new QueryClient();

// The background solar system video — used as opening intro if no custom video is set
const FALLBACK_VIDEO_URL = '/assets/portal-solar-system-bg.mp4';

// How long (ms) to show the fallback video before auto-proceeding to portal
// The bg video loops, so we can't rely on onEnded — we use a timer instead
const FALLBACK_INTRO_DURATION = 5000;

function OpeningVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [failed, setFailed] = useState(false);

  const customVideoUrl =
    typeof window !== 'undefined'
      ? localStorage.getItem(OPENING_VIDEO_KEY) || null
      : null;

  const videoUrl = customVideoUrl || FALLBACK_VIDEO_URL;
  const isCustom = !!customVideoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().then(() => setCanStart(true)).catch(() => setCanStart(false));
  }, [videoUrl]);

  // If using the fallback looping bg video, auto-advance after FALLBACK_INTRO_DURATION
  useEffect(() => {
    if (isCustom) return; // custom video uses onEnded
    const timer = setTimeout(() => {
      onDone();
    }, FALLBACK_INTRO_DURATION);
    return () => clearTimeout(timer);
  }, [isCustom, onDone]);

  if (failed) return null;

  return (
    <div className="opening-video-overlay">
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="opening-video"
        onCanPlay={() => setCanStart(true)}
        onEnded={isCustom ? onDone : undefined}
        onError={() => {
          setFailed(true);
          onDone();
        }}
      />
      {!canStart && (
        <button
          className="opening-start-button"
          onClick={() =>
            videoRef.current
              ?.play()
              .then(() => setCanStart(true))
              .catch(onDone)
          }
        >
          Enter Portal
        </button>
      )}
      <button onClick={onDone} className="opening-skip-button">
        Skip ›
      </button>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [introPlayed, setIntroPlayed] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!introPlayed && <OpeningVideo onDone={() => setIntroPlayed(true)} />}
        <div
          style={{
            opacity: introPlayed ? 1 : 0,
            transition: 'opacity 0.8s ease',
            height: '100vh',
          }}
        >
          <WouterRouter>
            <Router />
          </WouterRouter>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
