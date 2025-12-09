const WaterDropLogo = ({ size = 32, className = "" }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Water drop shape */}
            <path
                d="M50 10C50 10 20 45 20 70C20 87.6731 34.3269 102 52 102C69.6731 102 84 87.6731 84 70C84 45 50 10 50 10Z"
                fill="url(#waterGradient)"
                stroke="url(#waterStroke)"
                strokeWidth="2"
            />

            {/* Highlight/shine effect */}
            <ellipse
                cx="42"
                cy="50"
                rx="12"
                ry="18"
                fill="white"
                opacity="0.3"
            />

            {/* Small bubble */}
            <circle
                cx="60"
                cy="75"
                r="4"
                fill="white"
                opacity="0.5"
            />

            {/* Gradient definitions */}
            <defs>
                <linearGradient id="waterGradient" x1="50" y1="10" x2="50" y2="102" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>

                <linearGradient id="waterStroke" x1="50" y1="10" x2="50" y2="102" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#93C5FD" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default WaterDropLogo;
