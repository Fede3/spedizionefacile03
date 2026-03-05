import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizza HTML per prevenire attacchi XSS.
 * Da usare prima di v-html per contenuti da database (articoli, guide, servizi).
 */
export function useSanitize() {
  const sanitize = (dirty) => {
    if (!dirty) return ''
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'a',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'pre', 'code', 'img', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span', 'hr', 'sub', 'sup',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
        'class', 'style', 'id', 'colspan', 'rowspan',
      ],
      ALLOW_DATA_ATTR: false,
    })
  }

  return { sanitize }
}
