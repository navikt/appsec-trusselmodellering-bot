const createRichText = (text = '') => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: text
          }
        ]
      }
    ]
  }
];

const richTextToPlainText = (richText = []) => {
  if (!Array.isArray(richText)) {
    return '';
  }

  const parts = [];

  for (const block of richText) {
    if (!block || !Array.isArray(block.elements)) continue;

    for (const element of block.elements) {
      if (!element || !Array.isArray(element.elements)) continue;

      for (const node of element.elements) {
        if (node && typeof node.text === 'string') {
          parts.push(node.text);
        }
      }
    }
  }

  return parts.join('');
};

const buildRichTextField = (columnId, text = '') => ({
  column_id: columnId,
  rich_text: createRichText(text)
});

module.exports = {
  createRichText,
  richTextToPlainText,
  buildRichTextField
};
