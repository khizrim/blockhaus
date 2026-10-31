export function loadSprites(spritesPath: Record<string, string> = {}): Promise<Record<string, HTMLImageElement>> {
  return Promise.all(Object.values(spritesPath).map(path => loadImage(path))).then(sprites => {
    const keys = Object.keys(spritesPath);
    const map = keys.map((key, index) => [key, sprites[index]]);
    return Object.fromEntries(map);
  }) as Promise<Record<string, HTMLImageElement>>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
