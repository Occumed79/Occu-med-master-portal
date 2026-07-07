import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function SetupAccount() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/');
  }, [setLocation]);

  return <div className="flex min-h-screen items-center justify-center bg-black text-white">Redirecting to portal...</div>;
}
