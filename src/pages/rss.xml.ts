import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getMainSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

export async function GET() {
  const posts = await getCollection("posts");
  const sortedPosts = getMainSortedPosts(posts);

  const response = await rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: getPostUrl(id, filePath, config.site.lang),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });

  response.headers.set("Content-Type", "application/rss+xml; charset=utf-8");
  return response;
}
