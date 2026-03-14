import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  inverted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  textClassName?: string;
}

const sizeClasses = {
  sm: {
    wrapper: 'gap-2',
    icon: 'w-8 h-8',
    text: 'text-xl',
  },
  md: {
    wrapper: 'gap-3',
    icon: 'w-10 h-10',
    text: 'text-2xl',
  },
  lg: {
    wrapper: 'gap-3',
    icon: 'w-12 h-12',
    text: 'text-3xl',
  },
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function BrandContent({ inverted = false, size = 'md', className, textClassName }: Omit<BrandLogoProps, 'href'>) {
  const palette = inverted ? 'text-white' : 'text-blue-700';
  const currentSize = sizeClasses[size];

  return (
    <span className={joinClasses('inline-flex items-center font-mono font-bold tracking-tight', currentSize.wrapper, className)}>
      <span className={joinClasses('relative overflow-hidden rounded-xl ring-1 ring-black/10', currentSize.icon)}>
        <Image src="/brand/chambanet-logo.svg" alt="Logo de ChambaNET" fill sizes="48px" priority className="object-cover" />
      </span>
      <span className={joinClasses(currentSize.text, palette, textClassName)}>ChambaNET</span>
    </span>
  );
}

export default function BrandLogo({ href, inverted = false, size = 'md', className, textClassName }: BrandLogoProps) {
  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        <BrandContent inverted={inverted} size={size} className={className} textClassName={textClassName} />
      </Link>
    );
  }

  return <BrandContent inverted={inverted} size={size} className={className} textClassName={textClassName} />;
}