import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

function _esaSchema<T extends Record<string, z.Schema>>(tagsSchema: T) {
  return z
    .object({
      title: z.string(),
      tags: z.preprocess((tags) => {
        if (tags == null) return {};
        if (typeof tags !== 'string') throw new Error('tags must be a string');

        const entries = tags.split(',').map((pair) => {
          const pairs = pair.split(':');
          const key = pairs.at(0)?.trim();
          const value = pairs.at(1)?.trim();
          if (!key || !value) return null;
          return [key, value];
        });

        const noneNullEntries = entries.filter((entry): entry is [string, string] => entry !== null);
        return z.object<T>(tagsSchema).parse(Object.fromEntries(noneNullEntries));
      }, z.object(tagsSchema)),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
      published: z.boolean(),
      number: z.number(),
    })
    .transform(({ tags, ...esa }) => {
      if (tags === undefined) throw new Error('tags is required');
      const { created_at, number, published, title } = esa;
      const date: Date = tags.date ?? created_at;
      return {
        number,
        published,
        title,
        tags,
        createdAt: date,
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
    }).transform(({ tags, ...esa }) => ({ ...esa,tags, link: `/${tags.page}` })),
  }),
  posts: defineCollection({
    loader: glob({ base: './contents/posts', pattern: '**/*.{md,mdx}' }),
    schema: _esaSchema({
      date: z.coerce.date().optional(),
    }).transform(({ number, ...esa }) => ({ ...esa, link: `/post/${number}` })),
  }),
};
