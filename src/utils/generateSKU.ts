export const generateSKU = (name: string, category: string) => {
  const n = name.slice(0, 3).toUpperCase();
  const c = category.slice(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${n}-${c}-${random}`;
};
