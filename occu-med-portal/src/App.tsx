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

function OpeningVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = typeof window !== 'undefined'
    ? localStorage.getItem(OPENING_VIDEO_KEY) ?? ''
    : '';

  useEffect(() => {
    if (!videoUrl) onDone();
  }, [videoUrl, onDone]);

  if (!videoUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onEnded={onDone}
      />
      <button
        onClick={onDone}
        style={{
          position: 'absolute',
          bottom: '2rem',
          right: '2rem',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          padding: '0.5rem 1.2rem',
          borderRadius: '999px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          backdropFilter: 'blur(8px)',
          letterSpacing: '0.1em',
        }}
      >
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
