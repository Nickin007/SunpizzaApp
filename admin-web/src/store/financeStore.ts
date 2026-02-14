import { create } from 'zustand';

interface FinanceState {
  currentBookId: number | null;
  currentBookName: string;
  setCurrentBook: (id: number | null, name: string) => void;
}

export const useFinanceStore = create<FinanceState>((set) => {
  // 从 localStorage 恢复
  const savedId = localStorage.getItem('finance_book_id');
  const savedName = localStorage.getItem('finance_book_name') || '';

  return {
    currentBookId: savedId ? parseInt(savedId, 10) : null,
    currentBookName: savedName,
    setCurrentBook: (id, name) => {
      if (id) {
        localStorage.setItem('finance_book_id', String(id));
        localStorage.setItem('finance_book_name', name);
      } else {
        localStorage.removeItem('finance_book_id');
        localStorage.removeItem('finance_book_name');
      }
      set({ currentBookId: id, currentBookName: name });
    },
  };
});
