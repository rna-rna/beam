
const avatarColors = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#FFC300',
  '#8E44AD', '#3498DB', '#E74C3C', '#2ECC71', '#F39C12'
];

export const getRandomColor = () => {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
};
