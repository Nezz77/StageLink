import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  
  const brandName = "StageLink";

  useEffect(() => {
    // Simulate loading progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 800); // Wait a moment after 100% before firing complete
          return 100;
        }
        return prev + 2; // Fast progress for demo
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  // Typewriter stagger variant
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const letterVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 12, stiffness: 200 } }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <img
          src="/stagelink-logo.png"
          alt="StageLink"
          className="w-64 md:w-80 object-contain"
          style={{ filter: 'drop-shadow(0 0 24px rgba(124,58,237,0.6)) drop-shadow(0 0 48px rgba(245,158,11,0.2))' }}
        />
      </motion.div>

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
