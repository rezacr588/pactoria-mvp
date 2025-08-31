import { classNames } from '../../utils/classNames';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showRing?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-14 w-14 text-xl',
  '2xl': 'h-16 w-16 text-2xl'
};

const statusClasses = {
  online: 'bg-success-400',
  offline: 'bg-neutral-400 dark:bg-secondary-500',
  away: 'bg-warning-400',
  busy: 'bg-danger-400'
};

const statusSizeClasses = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5',
  '2xl': 'h-4 w-4'
};

function generateAvatarUrl(name: string, size: string) {
  const sizeMap = { xs: '24', sm: '32', md: '40', lg: '48', xl: '56', '2xl': '64' };
  const pixelSize = sizeMap[size as keyof typeof sizeMap] || '40';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${pixelSize}&background=0ea5e9&color=fff&bold=true`;
}

export default function Avatar({
  src,
  alt = '',
  name = 'User',
  size = 'md',
  className,
  showRing = false,
  status,
  onClick
}: AvatarProps) {
  const avatarSrc = src || generateAvatarUrl(name, size);
  
  return (
    <div className={classNames('relative inline-block', className)}>
      <img
        className={classNames(
          'rounded-full object-cover',
          sizeClasses[size],
          showRing && 'ring-2 ring-primary-200 dark:ring-primary-600',
          onClick && 'cursor-pointer hover:ring-2 hover:ring-primary-200 dark:hover:ring-primary-600 transition-all'
        )}
        src={avatarSrc}
        alt={alt || name}
        onClick={onClick}
      />
      
      {status && (
        <span
          className={classNames(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-secondary-900',
            statusClasses[status],
            statusSizeClasses[size]
          )}
        />
      )}
    </div>
  );
}