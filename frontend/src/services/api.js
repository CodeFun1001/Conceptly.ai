import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 
                (import.meta.env.DEV 
                  ? 'http://localhost:8000' 
                  : window.location.origin + '/api');

console.log('Connecting to API:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response from API');
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data)
};

export const sessionAPI = {
  create: (data) => api.post('/sessions/', data),
  getAll: () => api.get('/sessions/'),
  getOne: (id) => api.get(`/sessions/${id}`),
  generateCheckpoints: (id) => api.post(`/sessions/${id}/checkpoints`),
  getCheckpoints: (id) => api.get(`/sessions/${id}/checkpoints`),
  getCheckpointContent: (sessionId, checkpointId) => api.get(`/sessions/${sessionId}/checkpoints/${checkpointId}/content`),
  getCheckpointQuestions: (sessionId, checkpointId) => api.get(`/sessions/${sessionId}/checkpoints/${checkpointId}/questions`),
  completeCheckpoint: (sessionId, checkpointId) => api.post(`/sessions/${sessionId}/checkpoints/${checkpointId}/complete`),
  completeSession: (id) => api.post(`/sessions/${id}/complete`),
  canCompleteSession: (id) => api.get(`/sessions/${id}/can-complete`)
};

export const checkpointAPI = {
  submitQuiz: (checkpointId, answers) => api.post(`/checkpoints/${checkpointId}/submit`, { answers }),
  getFeynman: (checkpointId, attempt = 0) => api.get(`/checkpoints/${checkpointId}/feynman?attempt=${attempt}`),
  retryQuiz: (checkpointId) => api.post(`/checkpoints/${checkpointId}/retry-quiz`)
};

export const analyticsAPI = {
  get: () => api.get('/analytics/'),
  getHistory: () => api.get('/analytics/history'),
  getSessionDetails: (sessionId) => api.get(`/analytics/sessions/${sessionId}/details`),
  getProgress: () => api.get('/analytics/progress')
};

export const gamificationAPI = {
  getProfile: () => api.get('/gamification/profile'),
  updateTutorMode: (mode) => api.patch('/gamification/tutor-mode', { tutor_mode: mode }),
  getBadges: () => api.get('/gamification/badges'),
  checkBadges: () => api.post('/gamification/badges/check'),
  getWeakTopics: () => api.get('/gamification/weak-topics'),
  getDailyChallenge: () => api.get('/gamification/daily-challenge'),
  completeChallenge: (id) => api.post(`/gamification/daily-challenge/${id}/complete`),
  createNote: (data) => api.post('/gamification/notes', data),
  getNotes: (sessionId) => api.get(`/gamification/notes/${sessionId}`),
  generateSmartNotes: (sessionId) => api.post(`/gamification/notes/${sessionId}/generate`)
};

export default api;