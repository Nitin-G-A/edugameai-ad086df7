import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Trophy, ClipboardList, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Analytics {
  totalStudents: number;
  totalQuizzes: number;
  totalAssignments: number;
  averageQuizScore: number;
  classStats: {
    name: string;
    students: number;
    quizzes: number;
    assignments: number;
  }[];
}

const TeacherAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Get classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);

      if (!classes?.length) {
        setAnalytics({
          totalStudents: 0,
          totalQuizzes: 0,
          totalAssignments: 0,
          averageQuizScore: 0,
          classStats: [],
        });
        setLoading(false);
        return;
      }

      const classIds = classes.map((c) => c.id);

      // Get total students
      const { count: studentCount } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds);

      // Get quizzes
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id')
        .eq('teacher_id', user.id);

      // Get assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('teacher_id', user.id);

      // Get quiz submissions for average score
      const { data: submissions } = await supabase
        .from('quiz_submissions')
        .select('score, quiz_id')
        .in('quiz_id', quizzes?.map((q) => q.id) || []);

      const avgScore = submissions?.length
        ? Math.round(
            submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.length
          )
        : 0;

      // Get class-level stats
      const classStats = await Promise.all(
        classes.map(async (cls) => {
          const { count: students } = await supabase
            .from('class_members')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          const { count: quizCount } = await supabase
            .from('quizzes')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          const { count: assignmentCount } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

          return {
            name: cls.name,
            students: students || 0,
            quizzes: quizCount || 0,
            assignments: assignmentCount || 0,
          };
        })
      );

      setAnalytics({
        totalStudents: studentCount || 0,
        totalQuizzes: quizzes?.length || 0,
        totalAssignments: assignments?.length || 0,
        averageQuizScore: avgScore,
        classStats,
      });
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          Analytics & Insights
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your class performance and student engagement
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold">{analytics?.totalStudents}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quizzes Created</p>
                <p className="text-3xl font-bold">{analytics?.totalQuizzes}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="text-3xl font-bold">{analytics?.totalAssignments}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
                <p className="text-3xl font-bold">{analytics?.averageQuizScore}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Class Breakdown</CardTitle>
          <CardDescription>Performance metrics by class</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.classStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No classes created yet. Create a class to see analytics.
            </p>
          ) : (
            <div className="space-y-4">
              {analytics?.classStats.map((cls, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted"
                >
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cls.students} students enrolled
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{cls.quizzes} quizzes</Badge>
                    <Badge variant="outline">{cls.assignments} assignments</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAnalytics;
