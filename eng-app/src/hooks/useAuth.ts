import { useSelector } from 'react-redux';
import { selectUser, selectProfile, selectIsAuthenticated, selectIsLoading } from '../store/slices/authSlice';

/**
 * Hook to access authentication-related state from Redux
 */
export const useAuth = () => {
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);

  return {
    user,
    profile,
    isAuthenticated,
    isLoading
  };
};

export default useAuth; 