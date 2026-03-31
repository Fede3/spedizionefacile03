/**
 * Sanitizza HTML per prevenire attacchi XSS.
 * Da usare prima di v-html per contenuti da database (articoli, guide, servizi).
 * Implementazione leggera senza dipendenze esterne.
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'a',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'hr', 'sub', 'sup',
])

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
  'class', 'style', 'id', 'colspan', 'rowspan',
])

function cleanNode(node) {
  if (node.nodeType === 3) return // text node — safe
  if (node.nodeType !== 1) { node.remove(); return } // non-element — remove

  const tag = node.tagName.toLowerCase()
  if (!ALLOWED_TAGS.has(tag)) {
    // Replace disallowed tag with its text content
    const text = document.createTextNode(node.textContent || '')
    node.replaceWith(text)
    return
  }

  // Remove disallowed attributes
  for (const attr of [...node.attributes]) {
    if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
      node.removeAttribute(attr.name)
    }
    // Block javascript: in href/src
    if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) {
      node.removeAttribute(attr.name)
    }
  }

  // Recurse children
  for (const child of [...node.childNodes]) {
    cleanNode(child)
  }
}

export function useSanitize() {
  const sanitize = (dirty) => {
    if (!dirty) return ''
    if (import.meta.server) return dirty // SSR: no DOM available, return as-is

    const doc = new DOMParser().parseFromString(dirty, 'text/html')
    for (const child of [...doc.body.childNodes]) {
      cleanNode(child)
    }
    return doc.body.innerHTML
  }

  return { sanitize }
}
