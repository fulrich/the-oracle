import Image from "next/image";

export function CharacterAvatar({
  displayName,
  initials,
  profileMediaId,
  className = "",
  sizes = "3.5rem",
}: {
  displayName: string;
  initials: string;
  profileMediaId?: string | null;
  className?: string;
  sizes?: string;
}) {
  return (
    <span
      className={`relative grid place-items-center overflow-hidden ${className}`}
    >
      {profileMediaId ? (
        <Image
          alt={`${displayName} profile image`}
          className="object-cover"
          fill
          sizes={sizes}
          src={`/api/memory-media/${profileMediaId}`}
          unoptimized
        />
      ) : (
        initials
      )}
    </span>
  );
}
