import create from 'zustand';

export const useHealthStore = create((set) => ({
  status: null,
  loading: false,
  error: null,
  async check() {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      set({ status: data, loading: false });
      if (process.env.NODE_ENV === 'development') {
        // В продакшене здесь будет структурированное логирование
      }
    } catch (e) {
      set({ error: 'Health check failed', loading: false });
    }
  }
}));


