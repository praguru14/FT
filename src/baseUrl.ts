export const baseUrl = {
  apiUrl:
    window.location.hostname === 'localhost'
      ? 'http://localhost:8090/transactions'
      : 'https://financetracker-vgmc.onrender.com/transactions',
};
