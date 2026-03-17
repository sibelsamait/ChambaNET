'use client';

import Avatar from './Avatar';

interface ProfileSummaryProps {
  fullName: string;
  ratingText: string;
  initialImageUrl?: string | null;
}

export default function ProfileSummary({
  fullName,
  ratingText,
  initialImageUrl,
}: ProfileSummaryProps) {
  return (
    <div className="border-b border-blue-200 p-4">
      <div className="flex items-center gap-4">
        <Avatar
          imageUrl={initialImageUrl}
          name={fullName}
          alt="Foto de perfil"
          className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-blue-200 object-cover"
          fallbackClassName="text-sm"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-black sm:text-lg">{fullName || 'Usuario'}</h2>
          <p className="flex items-center gap-1 text-xs font-bold text-gray-900 sm:text-sm">☆ {ratingText}</p>
        </div>
      </div>
    </div>
  );
}