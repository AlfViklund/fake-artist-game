import { CategoryWords, WORD_BANK } from '@/types/game';

export { WORD_BANK };
export type { CategoryWords };

/**
 * Returns a random category-word pair from the word bank.
 * If categoryId is provided, returns a random word from that specific category.
 */
export function getRandomWord(categoryId?: string): { category: string; word: string } {
  let selectedCategory: CategoryWords;
  if (categoryId) {
    selectedCategory = WORD_BANK.find((c) => c.id === categoryId) || WORD_BANK[0];
  } else {
    selectedCategory = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  }

  const word = selectedCategory.words[Math.floor(Math.random() * selectedCategory.words.length)];
  return { category: selectedCategory.name, word };
}
