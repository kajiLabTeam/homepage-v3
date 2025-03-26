import { getCollection, type CollectionEntry } from 'astro:content';
import kaji from '@/assets/kaji.webp';

const IMAGE_REGEX = /[\s\n]*(<img.*?src=['"](.*)['"].*>|!\[.*\]\((.*)\))/;

export async function getPosts(offset: number = 0, limit: number | undefined = undefined) {
  const posts = (await getCollection('posts'))
    .sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
    .filter((post) => post.data.title !== 'README')
    .slice(offset, limit);

  return posts;
}

export async function getPage(pageName: string) {
  const page = (await getCollection('pages'))
    .sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
    .find((post) => post.data.tags?.page === pageName);

  return page;
}

export function getThumbnail(post: CollectionEntry<'posts'>): string {
  const matches = post.body?.match(IMAGE_REGEX);
  return matches?.at(2) ?? matches?.at(3) ?? kaji.src;
}
