import { useEffect, useRef, useState } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import SetupAccount from "@/pages/SetupAccount";
import { loadPortalState } from '@/lib/portalBackend';

const queryClient = new QueryClient();

const DEFAULT_OPENING_VIDEO_URL =
  'https://res.cloudinary.com/dhsvsnnec/video/upload/Portal-Opening_z8nexs.mp4';

const INTRO_BYPASS_PATHS = new Set(['/login', '/admin', '/setup-account']);

function shouldBypassIntro(): boolean {
  if (typeof window === 'undefined') return false;
  return INTRO_BYPASS_PATHS.has(window.location.pathname);
}

function OpeningVideo({ videoUrl, onDone }: { videoUrl: string; onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsClick, setNeedsClick] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      onDone();
      return;
    }

    const attempt = video.play();
    if (attempt) {
      attempt.catch(() => {
        setNeedsClick(true);
      });
    }

    const timer = setTimeout(onDone, 30000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="opening-video-overlay">
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        playsInline
        preload="auto"
        className="opening-video"
        onEnded={onDone}
        onError={onDone}
      />
      {needsClick && (
        <button
          className="opening-start-button"
          onClick={() => {
            videoRef.current?.play().catch(onDone);
            setNeedsClick(false);
          }}
        >
          Enter Portal
        </button>
      )}
      <button onClick={onDone} className="opening-skip-button">
        Skip
      </button>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/admin" component={Admin} />
      <Route path="/setup-account" component={SetupAccount} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const bypassIntro = shouldBypassIntro();
  const [introPlayed, setIntroPlayed] = useState(bypassIntro);
  const [openingVideoUrl, setOpeningVideoUrl] = useState(DEFAULT_OPENING_VIDEO_URL);

  useEffect(() => {
    if (bypassIntro) return;

    let mounted = true;

    async function loadOpeningVideo() {
      const state = await loadPortalState();
      if (!mounted) return;

      if (state?.openingVideoUrl?.trim()) {
        setOpeningVideoUrl(state.openingVideoUrl.trim());
      }
    }

    void loadOpeningVideo();

    return () => {
      mounted = false;
    };
  }, [bypassIntro]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!introPlayed && !bypassIntro && (
          <OpeningVideo videoUrl={openingVideoUrl} onDone={() => setIntroPlayed(true)} />
        )}
        {(introPlayed || bypassIntro) && (
          <div style={{ height: '100vh' }}>
            <WouterRouter>
              <Router />
            </WouterRouter>
          </div>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
