import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('Password reset email sent!');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">EduGame AI</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground mb-2">Forgot password</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {sent ? 'Check your email for the reset link.' : 'Enter your email to receive a password reset link.'}
          </p>

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-lg"
              />
              <Button type="submit" className="w-full h-12 rounded-lg text-base" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
          )}

          <Link to="/auth" className="flex items-center gap-1 text-sm text-primary hover:underline mt-6">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
