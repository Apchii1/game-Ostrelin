const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
  });

export async function loadAssets() {
  const [player, background, coin, goal] = await Promise.all([
    loadImage("./assets/player.png"),
    loadImage("./assets/background.png"),
    loadImage("./assets/coin.png"),
    loadImage("./assets/goal.png"),
  ]);

  return {
    player,
    background,
    coin,
    goal,
  };
}
