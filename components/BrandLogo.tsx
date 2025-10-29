import * as React from 'react';

type BrandLogoVariant = 'wordmark' | 'icon';

interface BrandLogoProps {
    className?: string;
    variant?: BrandLogoVariant;
}

const LOGO_SOURCES: Record<BrandLogoVariant, string> = {
    wordmark: '/assets/logo-wordmark.png',
    icon: '/assets/logo-icon.png',
};

const BrandLogo: React.FC<BrandLogoProps> = ({ className, variant = 'wordmark' }) => {
    const combinedClassName = className ? `select-none ${className}` : 'select-none';

    return (
        <img
            src={LOGO_SOURCES[variant]}
            alt="Dripfy logo"
            className={combinedClassName}
            loading="lazy"
        />
    );
};

export default BrandLogo;
