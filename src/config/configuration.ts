export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  internalApiKey: process.env.INTERNAL_API_KEY,

  signer: {
    baseUrl: process.env.SIGNER_BASE_URL ?? 'http://localhost:3001',
  },

  blockchain: {
    fujiRpcUrl: process.env.FUJI_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc',
    fujiWssUrl: process.env.FUJI_WSS_URL ?? 'wss://api.avax-test.network/ext/bc/C/ws',
  },

  web3Auth: {
    jwksUrl: process.env.WEB3AUTH_JWKS_URL ?? 'https://api.openlogin.com/jwks',
  },

  game: {
    gameId: parseInt(process.env.GAME_ID ?? '1', 10),
    survivalModeId: parseInt(process.env.SURVIVAL_MODE_ID ?? '1', 10),
  },
});