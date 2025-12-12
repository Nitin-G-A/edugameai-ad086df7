import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Flame, 
  Trophy, 
  BookOpen, 
  Brain, 
  ClipboardList, 
  MessageCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import Leaderboard from '@/components/Leaderboard';

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { getLevelThreshold } = useGamification();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    classCount: 0,
    pendingAssignments: 0,
    quizzesCompleted: 0,
    doubtsAsked: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Get class count
      const { count: classCount } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user?.id);

      // Get pending assignments count
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user?.id);

      let pendingAssignments = 0;
      if (memberships?.length) {
        const classIds = memberships.map(m => m.class_id);
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id')
          .in('class_id', classIds)
          .gte('deadline', new Date().toISOString());

        if (assignments?.length) {
          const { count: submittedCount } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user?.id)
            .in('assignment_id', assignments.map(a => a.id));

          pendingAssignments = assignments.length - (submittedCount || 0);
        }
      }

      // Get quiz submissions count
      const { count: quizzesCompleted } = await supabase
        .from('quiz_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user?.id);

      // Get doubts count
      const { count: doubtsAsked } = await supabase
        .from('doubts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user?.id);

      setStats({
        classCount: classCount || 0,
        pendingAssignments,
        quizzesCompleted: quizzesCompleted || 0,
        doubtsAsked: doubtsAsked || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentXP = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  const xpForCurrentLevel = getLevelThreshold(currentLevel - 1);
  const xpForNextLevel = getLevelThreshold(currentLevel);
  const progressInLevel = ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const quickActions = [
    { icon: MessageCircle, label: 'Ask a Doubt', href: '/student/doubt-solver', color: 'text-blue-500' },
    { icon: Trophy, label: 'Take a Quiz', href: '/student/quiz', color: 'text-yellow-500' },
    { icon: Brain, label: 'Summarize Notes', href: '/student/summarizer', color: 'text-purple-500' },
    { icon: ClipboardList, label: 'View Assignments', href: '/student/assignments', color: 'text-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to continue your learning journey?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1 py-1.5 px-3">
            <Flame className="w-4 h-4 text-destructive" />
            <span>{profile?.streak_days || 0} day streak</span>
          </Badge>
        </div>
      </div>

      {/* Level Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">Level {currentLevel}</p>
                <p className="text-sm text-muted-foreground">{currentXP} XP total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{Math.round(xpForNextLevel - currentXP)} XP to next level</p>
              <p className="text-xs text-muted-foreground">Level {currentLevel + 1}</p>
            </div>
          </div>
          <Progress value={Math.max(0, Math.min(100, progressInLevel))} className="h-3" />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link to={action.href} key={action.label}>
            <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <action.icon className={`w-8 h-8 mx-auto mb-2 ${action.color}`} />
                <p className="font-medium text-sm">{action.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Your Progress</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Classes Enrolled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{stats.classCount}</span>
                  <BookOpen className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{stats.pendingAssignments}</span>
                  <ClipboardList className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quizzes Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{stats.quizzesCompleted}</span>
                  <Trophy className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Doubts Asked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{stats.doubtsAsked}</span>
                  <MessageCircle className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.classCount === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">Join Your First Class</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get a class code from your teacher and join to get started!
                </p>
                <Link to="/student/classes">
                  <Button className="gap-2">
                    Join a Class <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
