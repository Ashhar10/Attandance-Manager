import React from 'react'

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Skeleton */}
      <div className="px-5 sm:px-8 py-4 bg-bg-surface/50 border-b border-border/50 flex items-center justify-between animate-pulse">
        <div className="h-6 bg-bg-elevated rounded w-48"></div>
        <div className="h-8 bg-bg-elevated rounded-full w-24"></div>
      </div>
      
      {/* Page Content Skeleton */}
      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 bg-bg-elevated rounded w-40"></div>
            <div className="h-4 bg-bg-elevated rounded w-24"></div>
          </div>
          <div className="h-10 bg-bg-elevated rounded w-32"></div>
        </div>
        
        {/* Top Cards Skeleton */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 space-y-4 border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bg-elevated rounded-xl"></div>
                <div className="h-4 bg-bg-elevated rounded w-20"></div>
              </div>
              <div className="h-8 bg-bg-elevated rounded w-16 mt-2"></div>
            </div>
          ))}
        </div>

        {/* Main Content Area Skeleton */}
        <div className="card p-5 min-h-[300px] border-border/30 flex flex-col">
           <div className="flex items-center justify-between mb-6">
             <div className="h-6 bg-bg-elevated rounded w-48"></div>
             <div className="h-8 bg-bg-elevated rounded w-24"></div>
           </div>
           <div className="space-y-3 flex-1">
             {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="h-14 bg-bg-elevated rounded-xl w-full"></div>
             ))}
           </div>
        </div>
      </div>
    </div>
  )
}
