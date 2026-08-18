import { AvatarImage } from "@/components/ui/avatar";
import { useSignedPhotoUrl } from "@/lib/storagePhotos";
import type { ComponentPropsWithoutRef } from "react";

type ImgProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & { src?: string | null };

/** <img> that resolves private-bucket storage URLs into short-lived signed URLs. */
export const SignedImg = ({ src, ...props }: ImgProps) => {
  const resolved = useSignedPhotoUrl(src);
  if (!resolved) return null;
  return <img src={resolved} {...props} />;
};

type AvatarImageProps = Omit<ComponentPropsWithoutRef<typeof AvatarImage>, "src"> & {
  src?: string | null;
};

/** Avatar image that resolves private-bucket storage URLs into signed URLs. */
export const SignedAvatarImage = ({ src, ...props }: AvatarImageProps) => {
  const resolved = useSignedPhotoUrl(src);
  if (!resolved) return null;
  return <AvatarImage src={resolved} {...props} />;
};
