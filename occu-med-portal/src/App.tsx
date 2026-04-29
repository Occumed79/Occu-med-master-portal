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

const OPENING_VIDEO_URL =
  'https://lmfdwtkaaevqwrpbvyai.supabase.co/storage/v1/object/public/portal-assets/opening/1777360444553-Portal_Opening.mp4';

function OpeningVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Do NOT mute — user wants sound
    const attempt = video.play();
    if (attempt) {
      attempt.then(() => setCanStart(true)).catch(() => {
        // Autoplay with sound was blocked — show the Enter button
        setCanStart(false);
      });
    }
  }, []);

  if (failed) return null;

  return (
    <div className="opening-video-overlay">
      <video
        ref={videoRef}
        src={OPENING_VIDEO_URL}
        autoPlay
        playsInline
        preload="auto"
        className="opening-video"
        onCanPlay={() => setCanStart(true)}
        onEnded={onDone}
        onError={() => {
          setFailed(true);
          onDone();
        }}
      />
      {/* Show "Enter Portal" if autoplay with sound was blocked */}
      {!canStart && (
        <button
          className="opening-start-button"
          onClick={() => {
            videoRef.current?.play()
              .then(() => setCanStart(true))
              .catch(onDone);
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
