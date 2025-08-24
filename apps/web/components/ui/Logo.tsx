interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10', // Increased from h-8 w-8 to match text height
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20'
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <div className={`relative flex items-center ${sizeClasses[size]} ${className}`}>
      <img
        src="/jobbot logo .png"
        alt="JobBot"
        className="h-full w-full object-contain"
        style={{ imageRendering: 'crisp-edges' }} // Added for better image quality
      />
    </div>
  );
}