import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, role, loading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [justSignedUpAsTeacher, setJustSignedUpAsTeacher] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>(
    searchParams.get('role') === 'teacher' ? 'teacher' : 'student'
  );

  useEffect(() => {
    // Skip auto-redirect if user just signed up as teacher (we handle that manually)
    if (justSignedUpAsTeacher) return;
    
    if (!loading && user && role) {
      navigate(role === 'teacher' ? '/teacher' : '/student');
    }
  }, [user, role, loading, navigate, justSignedUpAsTeacher]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
      if (selectedRole === 'teacher' && !inviteCode.trim()) {
        toast.error('Please enter a teacher invite code');
        return;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    
    // First create the account
    const { error } = await signUp(email, password, fullName);

    if (error) {
      setIsLoading(false);
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // If teacher role selected, try to use the invite code
    if (selectedRole === 'teacher') {
      // Wait a moment for the user to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the newly created user
      const { data: { user: newUser } } = await supabase.auth.getUser();
      
      if (newUser) {
        const { data: codeValid, error: codeError } = await supabase
          .rpc('use_teacher_invite_code', { 
            p_code: inviteCode.trim(),
            p_user_id: newUser.id 
          });
        
        if (codeError || !codeValid) {
          setIsLoading(false);
          toast.error('Invalid or expired invite code. Account created as student.');
          return;
        }
        
        toast.success('Teacher account created successfully!');
        // Prevent useEffect from redirecting to student dashboard
        setJustSignedUpAsTeacher(true);
        setIsLoading(false);
        // Force navigation to teacher dashboard
        navigate('/teacher');
        return;
      }
    } else {
      toast.success('Account created successfully!');
    }
    
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">EduGame AI</span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to continue learning</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={selectedRole === 'student' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col gap-1"
                        onClick={() => setSelectedRole('student')}
                      >
                        <BookOpen className="h-5 w-5" />
                        <span>Student</span>
                      </Button>
                      <Button
                        type="button"
                        variant={selectedRole === 'teacher' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col gap-1"
                        onClick={() => setSelectedRole('teacher')}
                      >
                        <Users className="h-5 w-5" />
                        <span>Teacher</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {selectedRole === 'teacher' && (
                    <div className="space-y-2">
                      <Label htmlFor="invite-code">Teacher Invite Code</Label>
                      <Input
                        id="invite-code"
                        type="text"
                        placeholder="Enter invite code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Contact your administrator to get a teacher invite code
                      </p>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      `Create ${selectedRole === 'teacher' ? 'Teacher' : 'Student'} Account`
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;