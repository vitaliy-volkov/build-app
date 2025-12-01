export const runtimeConfig = {
  // API URL: Must be provided in environment variables. 
  // In development, it can fall back to relative path (proxy), but in production it should be set.
  apiUrl: import.meta.env.VITE_API_URL || '',
  
  // App Environment
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  
  // Public URL
  publicUrl: import.meta.env.VITE_APP_PUBLIC_URL || '',
  
  // Gemini API Key
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  
  // AI Gateway URL
  aiGatewayUrl: import.meta.env.VITE_AI_GATEWAY_URL || '',

  // WS URL
  wsUrl: import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'ws://localhost:8080/ws' : ''),
};

// Validation for required variables in production
if (import.meta.env.PROD && !runtimeConfig.apiUrl) {
  console.error('CRITICAL: VITE_API_URL is not set in production environment!');
}
