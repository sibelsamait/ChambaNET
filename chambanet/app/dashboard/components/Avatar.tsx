import Image from 'next/image';

interface AvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  alt: string;
  className: string;
  fallbackClassName?: string;
  labelClassName?: string;
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name?: string | null) {
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') ?? '';

  return initials || 'U';
}

export default function Avatar({
  imageUrl,
  name,
  alt,
  className,
  fallbackClassName,
  labelClassName,
}: AvatarProps) {
  if (imageUrl) {
    return (
      <div className={joinClasses(className, 'relative overflow-hidden')}>
        <Image src={imageUrl} alt={alt} fill unoptimized sizes="64px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-label={alt}
      className={joinClasses(
        className,
        'flex items-center justify-center bg-gray-100 text-gray-600',
        fallbackClassName
      )}
    >
      <span className={joinClasses('font-bold uppercase', labelClassName)}>{getInitials(name)}</span>
    </div>
  );
}