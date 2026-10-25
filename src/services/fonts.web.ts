// The web preview has no Apple rounded font, so it borrows Nunito, which is close, for screenshots only.
export const loadFonts = () => {
  if (typeof document === 'undefined' || document.getElementById('nuzzle-font')) return;
  const link = document.createElement('link');
  link.id = 'nuzzle-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800&display=swap';
  document.head.appendChild(link);
};
