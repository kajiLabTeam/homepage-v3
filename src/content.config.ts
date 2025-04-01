import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

function _esaSchema<T extends Record<string, z.Schema>>(tagsSchema: T) {
  return z
    .object({
      title: z.string(),
      tags: z.preprocess(
        (tags) => {
          if (tags == null) return { _other: [] as string[] };
          if (typeof tags !== 'string') throw new Error('tags must be a string');

          const entries = tags
            .split(',')
            .map((pair) => {
              const pairs = pair.split(':');
              const key = pairs.at(0)?.trim();
              const value = pairs.at(1)?.trim();
              if (!key || !value) return null;
              return [key, value];
            })
            .filter((entry): entry is [string, string] => entry !== null);
          const otherTags = tags
            .split(',')
            .map((pair) => {
              if (pair.includes(':')) return null;
              const key = pair.trim();
              if (!key) return null;
              return key;
            })
            .filter((t): t is string => t !== null);

          return { _other: otherTags, ...Object.fromEntries(entries) };
        },
        z.object({ ...tagsSchema, _other: z.array(z.string()) }),
      ),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
      published: z.boolean(),
      number: z.number(),
    })
    .transform(({ tags, ...esa }) => {
      if (tags === undefined) throw new Error('tags is required');
      const { _other, ...t } = tags;
      if (_other === undefined) throw new Error('_other is required');

      const { created_at, number, published, title } = esa;
      const date: Date = tags.date ?? created_at;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const deleted = [..._other].includes('deleted');

      return {
        number,
        published,
        title,
        tags: t,
        createdAt: date,
        createdAtStr: `${year}年${month}月${day}日`,
        keywords: [..._other].filter((tag) => tag !== 'deleted'),
        deleted,
      };
    });
}

export const collections = {
  pages: defineCollection({
    loader: glob({ base: './contents/pages', pattern: '**/*.{md,mdx}' }),
    schema: _esaSchema({
      date: z.coerce.date().optional(),
      page: z.string().optional().default('other'),
      sort: z.coerce.number().optional().default(0),
    }).transform(({ tags, ...esa }) => ({ ...esa, tags, link: `/${tags.page}` })),
  }),
  posts: defineCollection({
    loader: glob({ base: './contents/posts', pattern: '**/*.{md,mdx}' }),
    schema: _esaSchema({
      date: z.coerce.date().optional(),
    }).transform(({ number, ...esa }) => ({ ...esa, number, link: `/post/${number}` })),
  }),
};
