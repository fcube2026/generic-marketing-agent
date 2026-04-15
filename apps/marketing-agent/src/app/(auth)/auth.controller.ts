import { loginRequest, type LoginCredentials } from './auth.service';

const TOKEN_KEY = 'marketing_token';
const USER_KEY = 'marketing_user';

// Store the session token and user information in localStorage and cookies
function storeSession(token: string, user: { email: string; role: string }): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

// Clear the session token and user information from localStorage and cookies
function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

// Login function to authenticate user and store session
export async function login(credentials: LoginCredentials): Promise<{ email: string; role: string }> {
  const { token, user } = await loginRequest(credentials);  // Login request to backend
  storeSession(token, user);  // Store token and user details
  return user;  // Return user details
}

// Logout function to clear the session
export function logout(): void {
  clearSession();  // Clear stored session data
}

import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Admin login endpoint
  @Public()
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  // Marketing agent login endpoint
  @Public()
  @Post('marketing-login')  // Marketing agent login endpoint
  marketingLogin(@Body() dto: AdminLoginDto) {
    return this.authService.marketingLogin(dto);  // Calls the service method for marketing agent login
  }
}
