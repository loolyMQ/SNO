const { Pact } = require('@pact-foundation/pact');
const path = require('path');

describe('API Gateway - Auth Service Contract', () => {
  let provider;

  beforeAll(() => {
    provider = new Pact({
      consumer: 'api-gateway',
      provider: 'auth-service',
      port: 3003,
      log: path.resolve(process.cwd(), 'logs', 'pact.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'INFO',
    });
  });

  beforeEach(() => {
    return provider.setup();
  });

  afterEach(() => {
    return provider.verify();
  });

  afterAll(() => {
    return provider.finalize();
  });

  describe('POST /auth/login', () => {
    beforeEach(() => {
      return provider
        .given('user exists with valid credentials')
        .uponReceiving('a login request')
        .withRequest({
          method: 'POST',
          path: '/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'test@example.com',
            password: 'password123',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            token: 'mock-jwt-token',
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'user',
            },
          },
        });
    });

    it('should return JWT token for valid credentials', async () => {
      const response = await fetch('http://localhost:3003/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBe('mock-jwt-token');
      expect(data.user.email).toBe('test@example.com');
    });
  });

  describe('POST /auth/register', () => {
    beforeEach(() => {
      return provider
        .given('user does not exist')
        .uponReceiving('a registration request')
        .withRequest({
          method: 'POST',
          path: '/auth/register',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'newuser@example.com',
            password: 'password123',
          },
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            user: {
              id: '2',
              email: 'newuser@example.com',
            },
          },
        });
    });

    it('should create new user', async () => {
      const response = await fetch('http://localhost:3003/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('newuser@example.com');
    });
  });

  describe('GET /health', () => {
    beforeEach(() => {
      return provider
        .given('auth service is healthy')
        .uponReceiving('a health check request')
        .withRequest({
          method: 'GET',
          path: '/health',
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            status: 'ok',
            service: 'auth-service',
          },
        });
    });

    it('should return health status', async () => {
      const response = await fetch('http://localhost:3003/health');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('auth-service');
    });
  });
});
