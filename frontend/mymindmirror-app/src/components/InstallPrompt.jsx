import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowInstall(false);
      });
    }
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition"
      >
        <Download size={18} /> Install App
      </button>
    </div>
  );
}

export default InstallPrompt;