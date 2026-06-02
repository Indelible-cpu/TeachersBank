import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300 z-50">
      <div className="relative flex flex-col items-center p-8 rounded-2xl glass shadow-2xl max-w-sm w-full mx-4 text-center">
        {/* Text cues */}
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1 tracking-tight">
          Loading....
        </p>

        {/* Sleek slim loadbar */}
        <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-infinite-loading"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
