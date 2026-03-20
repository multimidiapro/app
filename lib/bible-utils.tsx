import Link from 'next/link';
import { BIBLE_BOOKS } from '@/lib/bible-data';

export function formatBibleText(text: string) {
  if (!text) return null;

  const bookNames = [...BIBLE_BOOKS].sort((a, b) => b.name.length - a.name.length).map(b => {
    return b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const unaccentedNames = bookNames.map(name => name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const allNames = Array.from(new Set([...bookNames, ...unaccentedNames]));
  
  const pattern = `(${allNames.join('|')})\\s+(\\d+):(\\d+)(?:-\\d+)?`;
  const regex = new RegExp(pattern, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchedString = match[0];
    const bookNameMatch = match[1];
    const chapter = match[2];
    const verse = match[3];
    
    const normalizedMatch = bookNameMatch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const book = BIBLE_BOOKS.find(b => 
      b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedMatch
    );

    if (book) {
      parts.push(
        <Link 
          key={match.index} 
          href={`/bible/${book.id}/${chapter}#v${verse}`}
          className="text-primary hover:underline font-medium"
        >
          {matchedString}
        </Link>
      );
    } else {
      parts.push(matchedString);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export function linkifyBibleReferencesMarkdown(text: string): string {
  if (!text) return text;

  const bookNames = [...BIBLE_BOOKS].sort((a, b) => b.name.length - a.name.length).map(b => {
    return b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const unaccentedNames = bookNames.map(name => name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const allNames = Array.from(new Set([...bookNames, ...unaccentedNames]));
  
  // Match existing markdown links OR bible references (with optional surrounding asterisks)
  const pattern = `\\[([^\\]]+)\\]\\(([^\\)]+)\\)|\\*\\*(${allNames.join('|')})\\s+(\\d+):(\\d+)(?:-\\d+)?\\*\\*|(${allNames.join('|')})\\s+(\\d+):(\\d+)(?:-\\d+)?`;
  const regex = new RegExp(pattern, 'gi');

  return text.replace(regex, (match, mdText, mdUrl, boldBookNameMatch, boldChapter, boldVerse, bookNameMatch, chapter, verse) => {
    // If it's an existing markdown link
    if (mdText && mdUrl) {
      // Encode the URL if it contains spaces, but preserve the hash fragment
      const [path, hash] = mdUrl.split('#');
      const encodedPath = path.split('/').map((part: string) => encodeURIComponent(decodeURIComponent(part))).join('/');
      const encodedUrl = hash ? `${encodedPath}#${hash}` : encodedPath;
      return `[${mdText}](${encodedUrl})`;
    }

    const actualBookName = boldBookNameMatch || bookNameMatch;
    const actualChapter = boldChapter || chapter;
    const actualVerse = boldVerse || verse;
    
    const normalizedMatch = actualBookName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const book = BIBLE_BOOKS.find(b => 
      b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedMatch
    );

    if (book) {
      const encodedId = encodeURIComponent(book.id);
      const displayMatch = match.replace(/\*\*/g, ''); // Remove asterisks for display
      return `[${displayMatch}](/bible/${encodedId}/${actualChapter}#v${actualVerse})`;
    }
    return match.replace(/\*\*/g, ''); // Remove asterisks even if book not found
  });
}
