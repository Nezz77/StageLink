import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setProgress(value => Math.min(value + 2, 100));
    }, 40);
    return () => {
      window.clearInterval(progressTimer);
    };
  }, []);

  useEffect(() => {
    if (progress === 100 && logoReady) onComplete();
  }, [logoReady, onComplete, progress]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] } }}
    >
      <div className="mb-6">
        <motion.img
          layoutId="stagelink-logo"
          src="/stagelink-logo.png"
          alt="StageLink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onLoad={() => setLogoReady(true)}
          onError={() => setLogoReady(true)}
          className="w-64 md:w-80 object-contain"
          transition={{ layout: { type: 'spring', stiffness: 52, damping: 19, mass: 1.25 } }}
          style={{ filter: 'drop-shadow(0 0 24px rgba(124,58,237,0.6)) drop-shadow(0 0 48px rgba(245,158,11,0.2))' }}
        />
      </div>

      <motion.p
        className="text-slate-400 text-sm tracking-[0.3em] uppercase font-medium mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        People &nbsp;|&nbsp; Talent &nbsp;|&nbsp; Events
      </motion.p>

      {/* Progress Bar Container */}
      <div className="w-64 md:w-96 h-1 bg-white/10 rounded-full overflow-hidden">
        {/* Progress Fill */}
        <motion.div
          className="h-full bg-violet-500 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear" }}
        />
      </div>
      
      {/* Loading Text */}
      <motion.div 
        className="mt-4 text-xs text-slate-500 font-mono tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        Connecting...
      </motion.div>
    </motion.div>
  );
}
