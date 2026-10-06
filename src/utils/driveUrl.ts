/**
 * Converts any Google Drive link to a direct high-speed CDN image URL
 * @example
 * getDriveImageUrl("https://drive.google.com/file/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG/view?usp=drive_link")
 * => "https://lh3.googleusercontent.com/d/1csTkWyUCt87yERd207qA38ZpVkwMQqXG"
 */
export function getDriveImageUrl(url: string): string {
  if (!url) return '';

  // If it's already an lh3 direct link or external image
  if (url.includes('lh3.googleusercontent.com/d/')) {
    return url;
  }

  // Extract file ID from google drive patterns
  // Pattern 1: /file/d/FILE_ID/
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFileD[1]}`;
  }

  // Pattern 2: id=FILE_ID
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }

  // Pattern 3: direct ID without URL
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
    return `https://lh3.googleusercontent.com/d/${url}`;
  }

  return url;
}

export function getDriveThumbnailFallback(url: string): string {
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://drive.google.com/thumbnail?id=${matchFileD[1]}&sz=w1000`;
  }
  return url;
}
