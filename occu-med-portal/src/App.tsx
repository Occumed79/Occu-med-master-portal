import { useEffect, useRef, useState } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";

const queryClient = new QueryClient();

// Opening video hardcoded from Supabase Storage
const OPENING_VIDEO_URL =
  'https://lmfdwtkaaevqwrpbvyai.supabase.co/storage/v1/object/public/portal-assets/opening/1777360444553-Portal_Opening.mp4';

function OpeningVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsClick, setNeedsClick] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) { onDone(); return; }

    const attempt = video.play();
    if (attempt) {
      attempt.catch(() => {
        // Autoplay with sound blocked — show Enter button
        setNeedsClick(true);
      });
    }

    // Safety fallback: if video hasn't ended after 30s, dismiss anyway
    const timer = setTimeout(onDone, 30000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="opening-video-overlay">
      <video
        ref={videoRef}
        src={OPENING_VIDEO_URL}
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
          ▶ Enter Portal
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
        {/* Portal is always mounted and interactive — just invisible until intro done */}
        <div
          style={{
            opacity: introPlayed ? 1 : 0,
            pointerEvents: introPlayed ? 'all' : 'none',
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
