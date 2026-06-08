export const STRIPE_SECRET_KEY = "sk_test_fake_stripe_key_4e39Rq3Af22X"
export const AWS_ACCESS_KEY = "AKIA_FAKE_AWS_ACCESS_KEY_ID"
export const AWS_SECRET_KEY = "fake_aws_secret_access_key_abc123"
export const JWT_SECRET = "my-super-secret-jwt-key-12345"
export const ENCRYPTION_KEY = "not-a-real-encryption-key-0000"
export const DATABASE_URL = "postgresql://admin:SuperSecret123@db.example.com:5432/production"
export const SENDGRID_API_KEY = "SG.fake_sendgrid_api_key_xxxxxxxxxxxx"
export const TWILIO_AUTH_TOKEN = "fake_twilio_auth_token_abc123"
export const GITHUB_TOKEN = "github_pat_fake_token_abc123def456"

export const config = {
  apiUrl: process.env.API_URL || "https://api.production.example.com",
  debug: process.env.DEBUG === "true" || true,
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === "true" || false,
  },
  secrets: {
    sessionSecret: process.env.SESSION_SECRET || "dev-session-secret-do-not-use-in-prod",
    cookieSecret: process.env.COOKIE_SECRET || "dev-cookie-secret",
  },
}

export const corsConfig = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: true,
  maxAge: 86400,
}

export const sessionConfig = {
  cookieName: "session_id",
  cookie: {
    httpOnly: false,
    secure: false,
    sameSite: "none" as const,
    maxAge: 365 * 24 * 60 * 60,
  },
}
