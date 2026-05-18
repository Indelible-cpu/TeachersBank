import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300 z-50">
      <div className="relative flex flex-col items-center p-8 rounded-2xl glass shadow-2xl max-w-sm w-full mx-4 text-center">
        {/* Modern high-performance pulse logo container */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 dark:bg-indigo-400/20 animate-ping duration-1000"></div>
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/40 dark:border-indigo-400/40 animate-spin duration-[8s]"></div>
          
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 dark:from-indigo-500 dark:to-violet-400 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <span className="text-white text-xl font-bold tracking-wider">TB</span>
          </div>
        </div>

        {/* Text cues */}
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
          TeachersBank
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Loading platform assets...
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
