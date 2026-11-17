import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "1";
  return {
    rules: { userAgent: "*", allow: indexable ? "/" : undefined, disallow: indexable ? undefined : "/" },
  };
}
