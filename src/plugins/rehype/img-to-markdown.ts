import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

function parseImgTag(imgTag: string): { [key: string]: string } | null {
  const regex = /<img\s+([^>]+)>/;
  const match = imgTag.match(regex);

  if (!match) return null;

  const attributesString = match[1];
  const attributes: { [key: string]: string } = {};

  const attrRegex = /(\w+)=["']([^"']+)["']/g;
  let attrMatch;

  while ((attrMatch = attrRegex.exec(attributesString)) !== null) {
    const [_, key, value] = attrMatch;
    attributes[key] = value;
  }

  return attributes;
}

const remarkImgToMarkdown: Plugin<[], Root> = () => {
  const transformer = (tree: any) => {
    visit(tree, 'html', (node) => {
      // img タグの場合はsrc属性を取得
      const isImgTag = node.value.match(/<img\s+[^>]+>/);
      if (!isImgTag) return;

      const attributes = parseImgTag(node.value);
      if (!attributes) return;

      node.type = 'image';
      node.title = attributes.title || null;
      node.alt = attributes.alt || null;
      node.url = attributes.src || null;
      delete node.value;
    });
  };

  return transformer;
};

export default remarkImgToMarkdown;
