// Markdown → texte simple, pour les surfaces qui ne savent AFFICHER que du texte.
//
// 🔑 T-089 — MiKL, 13-11 : « le corps du message est en format special, pkoi ? ».
// Elio ecrit en Markdown. La ou c'est rendu (chat, briefs, documents), c'est
// joli ; la ou ca ne l'est pas, le lecteur voit les `**`, les `##` et les `---`
// en clair. Deux reponses possibles : convertir (voir `markdownToHtml`, pour
// les emails) ou NETTOYER — c'est ce que fait cette fonction, pour les endroits
// qui n'affichent qu'une ligne de texte : la cloche de notification, le mot du
// Concierge, une pastille, un apercu.
//
// On RETIRE la notation, on GARDE le texte. Jamais l'inverse : perdre un mot
// serait pire que montrer une etoile.

/** Supprime la notation Markdown d'un texte, en conservant son contenu. */
export function markdownToPlainText(markdown: string | null | undefined): string {
  if (typeof markdown !== 'string' || markdown.length === 0) return ''

  let text = markdown

  // Blocs de code : on garde le code, on jette les ``` et le nom du langage.
  text = text.replace(/```[a-z]*\n?([\s\S]*?)```/gi, (_, code: string) => code.trim())
  // Code en ligne : `npm install` -> npm install
  text = text.replace(/`([^`]+)`/g, '$1')

  // Images AVANT les liens : ![alt](url) -> alt (sinon le `!` resterait seul).
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  // Liens : [texte](url) -> texte. L'URL disparait : elle n'est pas cliquable ici.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  // Traits de separation seuls sur leur ligne (`---`, `***`, `___`).
  text = text.replace(/^\s*([-*_])\s*(?:\1\s*){2,}$/gm, '')

  // Titres : `## Titre` -> Titre
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  // Citations : `> texte` -> texte
  text = text.replace(/^\s{0,3}>\s?/gm, '')
  // Puces : `- item` / `* item` / `1. item` -> item
  text = text.replace(/^\s*[-*+]\s+/gm, '')
  text = text.replace(/^\s*\d+\.\s+/gm, '')

  // Gras / italique, du plus long au plus court pour ne pas casser `***`.
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1')
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  // `_italique_` seulement entre limites de mot : un_nom_de_variable reste intact.
  text = text.replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1$2')

  // Au plus une ligne vide d'affilee, et rien qui traine aux extremites.
  text = text.replace(/[ \t]+$/gm, '')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
