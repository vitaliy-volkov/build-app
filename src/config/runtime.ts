export const runtimeConfig = {
  // API URL: v1 base path by default for consistent frontend/backend contract.
  // Can be overridden for production deployments via VITE_API_URL.
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  
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
