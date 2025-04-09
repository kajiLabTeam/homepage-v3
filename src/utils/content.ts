import { getCollection, type CollectionEntry } from 'astro:content';

const IMAGE_REGEX = /[\s\n]*(<img.*?src=['"](.*)['"].*>|!\[.*\]\((.*)\))/;

interface GetPostsArgs {
  offset?: number;
  limit?: number;
  keyword?: string;
}
function _isKeywordMatch(post: CollectionEntry<'posts'>, keyword: string | undefined) {
  if (!keyword) return true;
  return post.data.keywords.includes(keyword);
}
export async function getPosts({ offset = 0, limit, keyword }: GetPostsArgs = {}) {
  const posts = (await getCollection('posts'))
    .sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
    .filter((post) => !post.data.deleted && post.data.title !== 'README' && _isKeywordMatch(post, keyword))
    .slice(offset, limit && offset + limit);

  return posts;
}

export async function getPostKeywords() {
  const posts = await getPosts();
  const keywords = posts.flatMap((post) => post.data.keywords);
  const uniqueKeywords = Array.from(new Set(keywords));

  return uniqueKeywords;
}

export async function getPage(pageName: string) {
  const page = (await getPages()).find((post) => post.data.tags.page === pageName);

  return page;
}

export async function getPages() {
  const page = (await getCollection('pages'))
    .filter((page) => !page.data.deleted && page.data.title !== 'README')
    .sort((a, b) => b.data.tags.sort - a.data.tags.sort);

  return page;
}

export async function getSections(name?: string) {
  const sections = (await getCollection('sections'))
    .filter((section) => !section.data.deleted && section.data.title !== 'README')
    .sort((a, b) => b.data.tags.sort - a.data.tags.sort);

  if (name === undefined) return sections;

  return sections.filter((section) => section.data.tags.section === name);
}

export async function getSection(name: string) {
  const sections = await getSections(name);
  return sections.at(0);
}

export function getThumbnail(post: CollectionEntry<'posts'>): string {
  const matches = post.body?.match(IMAGE_REGEX);
  return matches?.at(2) ?? matches?.at(3) ?? '/img/kaji.webp';
}
