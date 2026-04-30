# Troubleshooting Login Issues

## "Empty reply from server" or "Connection closed unexpectedly"

### Problem
When making requests to the login endpoint, you receive one of these errors:
- `curl: (52) Empty reply from server`
- `The underlying connection was closed: The connection was closed unexpectedly.`

### Root Cause
This issue was caused by malformed JSON in the request body. The Express JSON body parser would throw an error before NestJS could handle it, causing the connection to close without sending any HTTP response.

### Fix Applied
Added an error handler middleware in `main.ts` that catches JSON parsing errors and returns a proper 400 Bad Request response with a clear error message:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid JSON in request body",
  "error": "Bad Request",
  "timestamp": "2026-04-30T10:57:38.076Z",
  "path": "/api/v1/auth/login"
}
```

### Common Causes of Malformed JSON

#### 1. Windows PowerShell Escaping Issues

**❌ WRONG** - Escaped quotes in PowerShell string:
```powershell
curl.exe -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\": \"admin@curex24.com\", \"password\": \"admin123\"}'
```

This sends the literal string: `{\"email\": \"admin@curex24.com\", ...}` which is invalid JSON.

**✅ CORRECT** - Use single quotes to prevent PowerShell from interpreting backslashes:
```powershell
curl.exe -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email": "admin@curex24.com", "password": "admin123"}'
```

**✅ BEST** - Use PowerShell's `Invoke-RestMethod` with proper objects:
```powershell
$body = @{
    email = "admin@curex24.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

#### 2. Unix/Linux Shell (bash, zsh)

**✅ CORRECT** - Use single quotes to prevent shell interpretation:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@curex24.com", "password": "admin123"}'
```

**✅ ALSO CORRECT** - Use a here-doc for complex JSON:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "email": "admin@curex24.com",
  "password": "admin123"
}
EOF
```

#### 3. Using Postman or Other API Clients

When using Postman, Insomnia, or similar tools:
1. Set the request body type to **JSON**
2. Ensure the Content-Type header is `application/json`
3. Paste your JSON directly without any escaping:
   ```json
   {
     "email": "admin@curex24.com",
     "password": "admin123"
   }
   ```

### Testing the Fix

You can verify that the server now handles malformed JSON gracefully:

```bash
# This will return a 400 error with a clear message, not an empty response
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": invalid json}'
```

Expected response:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid JSON in request body",
  "error": "Bad Request",
  "timestamp": "2026-04-30T11:05:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### Valid Login Request Examples

#### Admin Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@curex24.com", "password": "admin123"}'
```

#### Admin Login (Windows PowerShell)
```powershell
$body = @{
    email = "admin@curex24.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

# Access the token
$response.token
```

Expected successful response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@curex24.com",
    "role": "ADMIN"
  }
}
```

## Other Common Issues

### Wrong Credentials
If you receive a 401 Unauthorized error:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid admin credentials"
}
```

This means your email or password is incorrect. The default staging credentials are:
- Email: `admin@curex24.com`
- Password: `admin123`

### Account Deactivated
If the account exists but is deactivated:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Account is deactivated"
}
```

Contact an administrator to reactivate your account.

### Database Connection Issues
If the server cannot connect to the database:
```json
{
  "success": false,
  "statusCode": 503,
  "message": "Login service temporarily unavailable. Please try again shortly."
}
```

Check that:
1. The PostgreSQL database is running
2. The `DATABASE_URL` environment variable is correctly configured
3. The database migrations have been applied
