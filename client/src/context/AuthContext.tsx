import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthService, UserService, UserProfile } from '../api/services';
import { setInMemoryTokens } from '../api/client';
import { tokenStorage } from '../utils/storage';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; mobileNumber: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Auth State from Storage
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const accessToken = await tokenStorage.getItem('access_token');
        const refreshToken = await tokenStorage.getItem('refresh_token');

        if (accessToken && refreshToken) {
          // Store in memory for Axios interceptors
          setInMemoryTokens(accessToken, refreshToken);
          
          // Fetch user profile to verify token and load user details
          const profileResponse = await UserService.getProfile();
          setUser(profileResponse.data);
          setIsAuthenticated(true);
        }
      } catch (e) {
        // Tokens were invalid or server was offline
        console.log('Error restoring authentication tokens', e);
        // Clear corrupt tokens
        await tokenStorage.deleteItem('access_token');
        await tokenStorage.deleteItem('refresh_token');
        setInMemoryTokens(null, null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await AuthService.login(email, password);
      const { accessToken, refreshToken, user: userData } = response.data;

      // Save to memory
      setInMemoryTokens(accessToken, refreshToken);

      // Save to storage
      await tokenStorage.setItem('access_token', accessToken);
      await tokenStorage.setItem('refresh_token', refreshToken);

      // Fetch complete profile details (completion rate, bank details, etc)
      const profileResponse = await UserService.getProfile();
      setUser(profileResponse.data);
      setIsAuthenticated(true);
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; fullName: string; mobileNumber: string }) => {
    setIsLoading(true);
    try {
      await AuthService.register(data);
      // Automatically log in after successful registration
      await login(data.email, data.password);
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Call backend logout if possible (silent catch if server is offline)
      await AuthService.logout().catch(() => {});
    } finally {
      // Always clear local session
      setInMemoryTokens(null, null);
      await tokenStorage.deleteItem('access_token');
      await tokenStorage.deleteItem('refresh_token');
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const refreshProfile = async (): Promise<UserProfile> => {
    try {
      const response = await UserService.getProfile();
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.log('Error refreshing user profile', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
