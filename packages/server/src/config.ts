export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  bcryptRounds: 12,
  apiKeyPrefix: 'cm_'
} as const
