import Image from "next/image";

import type { ProfileMediaCrop } from "@/lib/profile-media";

export function CharacterAvatar({
  displayName,
  initials,
  profileMediaId,
  profileCrop,
  className = "",
  sizes = "3.5rem",
}: {
  displayName: string;
  initials: string;
  profileMediaId?: string | null;
  profileCrop?: ProfileMediaCrop | null;
  className?: string;
  sizes?: string;
}) {
  const croppedImageStyle = profileCrop
    ? {
        height: `${(profileCrop.sourceHeight / profileCrop.sourceWidth) * (100 / profileCrop.width)}%`,
        left: `${(-profileCrop.x / profileCrop.width) * 100}%`,
        top: `${(-profileCrop.y / profileCrop.width) * (profileCrop.sourceHeight / profileCrop.sourceWidth) * 100}%`,
        width: `${(100 / profileCrop.width).toFixed(4)}%`,
      }
    : undefined;

  return (
    <span
      className={`relative grid place-items-center overflow-hidden ${className}`}
    >
      {profileMediaId ? (
        profileCrop ? (
          <Image
            alt={`${displayName} profile image`}
            className="absolute max-w-none"
            height={100}
            sizes={sizes}
            src={`/api/memory-media/${profileMediaId}`}
            style={croppedImageStyle}
            unoptimized
            width={100}
          />
        ) : (
          <Image
            alt={`${displayName} profile image`}
            className="object-cover"
            fill
            sizes={sizes}
            src={`/api/memory-media/${profileMediaId}`}
            unoptimized
          />
        )
      ) : (
        initials
      )}
    </span>
  );
}
