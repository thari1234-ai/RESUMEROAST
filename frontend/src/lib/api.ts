const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? 'http://localhost:8001' : 'http://localhost:8001');

export default API_BASE;
