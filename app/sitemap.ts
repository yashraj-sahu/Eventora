
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://eventora-rho.vercel.app";

    const pages = [
        "",
        "/about",
        "/how-it-works",
        "/events",
        "/vendors",
        "/pricing",
        "/contact",
        "/planner",
    ];

    return pages.map((page) => ({
        url: `${baseUrl}${page}`,
        changeFrequency: "weekly",
        priority: page === "" ? 1 : 0.8,
    }));
}
