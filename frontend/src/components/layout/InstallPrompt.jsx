import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt]         = useState(false);
  const [installed, setInstalled]           = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 30 seconds
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowPrompt(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt || installed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-gray-700 max-w-sm">
        <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Install RevEngine</p>
          <p className="text-xs text-gray-400 mt-0.5">Add to home screen for quick access</p>
        </div>
        <button onClick={handleInstall}
          className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-all shrink-0">
          Install
        </button>
        <button onClick={() => setShowPrompt(false)}
          className="p-1 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
          <X size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
