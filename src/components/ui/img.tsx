import Image, { type ImageProps } from "next/image";

const OPTIMIZABLE = [/^\//, /\.public\.blob\.vercel-storage\.com/, /images\.unsplash\.com/, /res\.cloudinary\.com/];

/** next/image that gracefully handles SVGs and arbitrary admin-pasted URLs. */
export function Img({ src, alt, ...rest }: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  const url = src || "/images/placeholder.svg";
  const isSvg = /\.svg($|\?)/i.test(url);
  const optimizable = !isSvg && OPTIMIZABLE.some((r) => r.test(url)) && !url.startsWith("/uploads/");
  return <Image src={url} alt={alt} unoptimized={!optimizable} {...rest} />;
}
