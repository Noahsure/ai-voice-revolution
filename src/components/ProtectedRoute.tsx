import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user) return;
    const currentPath = window.location.pathname;
    if (currentPath === '/twilio-setup') return;

    (async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('twilio_account_sid, twilio_auth_token, phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        return;
      }

      const missing = !profile || !profile.twilio_account_sid || !profile.twilio_auth_token || !profile.phone_number;
      if (missing) {
        navigate('/twilio-setup');
      }
    })();
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-nexavoice-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};