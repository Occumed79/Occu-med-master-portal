import { useEffect, useMemo, useRef, useState } from 'react';
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

// Fallback to the background video already bundled in public/assets
const FALLBACK_VIDEO_URL = '/assets/portal-solar-system-bg.mp4';

function OpeningVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(FALLBACK_VIDEO_URL);
  const videoUrl = useMemo(() => {
    if (typeof window === 'undefined') return FALLBACK_VIDEO_URL;
    return localStorage.getItem(OPENING_VIDEO_KEY) || FALLBACK_VIDEO_URL;
  }, []);

  useEffect(() => {
    setActiveVideoUrl(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryStart = async () => {
      try {
        video.muted = false;
        video.volume = 1;
        await video.play();
        setCanStart(true);
      } catch {
        setCanStart(false);
      }
    };

    void tryStart();
  }, [activeVideoUrl]);

  if (failed) return null;

  return (
    <div className="opening-video-overlay">
      <video
        ref={videoRef}
        src={activeVideoUrl}
        autoPlay
        playsInline
        preload="auto"
        className="opening-video"
        onCanPlay={() => setCanStart(true)}
        onEnded={onDone}
        onError={() => {
          if (activeVideoUrl !== FALLBACK_VIDEO_URL) {
            setActiveVideoUrl(FALLBACK_VIDEO_URL);
            return;
          }
          setFailed(true);
          onDone();
        }}
      />
      {!canStart && (
        <button
          className="opening-start-button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = false;
            video.volume = 1;
            video
              .play()
              .then(() => setCanStart(true))
              .catch(onDone);
          }}
        >
          Enter Portal
        </button>
      )}
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
