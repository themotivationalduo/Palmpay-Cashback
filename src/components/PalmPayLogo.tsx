import React from 'react';

interface PalmPayLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  className?: string;
  variant?: 'badge' | 'full' | 'icon';
}

export const PalmPayIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-10 h-10',
}) => {
  return (
    <img
      src="/palmpay-icon-exact.png"
      alt="PalmPay Icon"
      className={`${className} object-contain select-none pointer-events-none drop-shadow-[0_4px_12px_rgba(98,20,148,0.5)]`}
      onError={(e) => {
        // Fallback to original seeklogo image
        (e.target as HTMLImageElement).src = '/palmpay-logo-png_seeklogo-480404.png';
      }}
    />
  );
};

export const PalmPayLogo: React.FC<PalmPayLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBadge = true,
  className = '',
  variant = 'badge'
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-lg', badge: 'text-[9px] px-1.5' },
    md: { icon: 'w-10 h-10 sm:w-11 sm:h-11', text: 'text-2xl sm:text-[26px]', badge: 'text-[10px] sm:text-xs px-2 py-0.5' },
    lg: { icon: 'w-13 h-13 sm:w-16 sm:h-16', text: 'text-3xl sm:text-4xl', badge: 'text-xs sm:text-sm px-2.5' },
    xl: { icon: 'w-18 h-18 sm:w-20 sm:h-20', text: 'text-4xl sm:text-5xl', badge: 'text-sm px-3' }
  };

  const { icon, text, badge } = sizeMap[size];

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="bg-white rounded-xl p-1.5 shadow-md flex items-center justify-center">
          <img
            src="/palmpay-logo-png_seeklogo-480404.png"
            alt="PalmPay Official Logo"
            className="h-9 sm:h-11 w-auto object-contain"
          />
        </div>
        {showBadge && (
          <span className="bg-gradient-to-r from-[#FFC107] to-[#FFA000] text-black font-black uppercase text-xs px-2 py-1 rounded-lg shadow-sm">
            Cashback
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Exact Hexagon Logo Mark from seeklogo upload */}
      <div className="shrink-0 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
        <PalmPayIcon className={icon} />
      </div>

      {showWordmark && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 leading-none">
            <span className={`font-black tracking-tight text-white font-['Poppins',sans-serif] ${text} lowercase`}>
              palm<span className="text-[#A855F7]">pay</span>
            </span>

            {showBadge && (
              <span className={`bg-gradient-to-r from-[#FFC107] to-[#FFA000] text-black font-black uppercase rounded-md shadow-sm tracking-wider ${badge}`}>
                Cashback
              </span>
            )}
          </div>
          <span className="text-[10px] text-purple-300/80 font-medium tracking-tight mt-0.5 hidden sm:inline-block">
            Official CBN Licensed Bank Platform
          </span>
        </div>
      )}
    </div>
  );
};
