import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Loader2, BookOpen, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import JoinClassDialog from '@/components/JoinClassDialog';

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  teacher_name?: string;
}

const MyClasses = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;

    try {
      // Get class IDs the student is a member of
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      const classIds = memberships.map(m => m.class_id);

      // Get class details
      const { data: classesData, error: classError } = await supabase
        .from('classes')
        .select('id, name, description, subject, teacher_id')
        .in('id', classIds);

      if (classError) throw classError;

      // Get teacher names
      const teacherIds = [...new Set((classesData || []).map(c => c.teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      const classesWithTeachers = (classesData || []).map(c => ({
        ...c,
        teacher_name: profileMap.get(c.teacher_id) || 'Unknown Teacher'
      }));

      setClasses(classesWithTeachers);
    } catch (error: any) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectLabel = (subject: string) => {
    switch (subject) {
      case 'computer_science': return 'Computer Science';
      case 'stem': return 'STEM';
      case 'humanities': return 'Humanities';
      default: return subject;
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'computer_science': return 'bg-blue-500/10 text-blue-500';
      case 'stem': return 'bg-green-500/10 text-green-500';
      case 'humanities': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-muted text-muted-foreground';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            My Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            View your enrolled classes and join new ones
          </p>
        </div>
        <Button onClick={() => setIsJoinDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Join Class
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Join a class using the code from your teacher to get started!
            </p>
            <Button onClick={() => setIsJoinDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Join Your First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {cls.teacher_name}
                    </CardDescription>
                  </div>
                  <Badge className={getSubjectColor(cls.subject)}>
                    {getSubjectLabel(cls.subject)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {cls.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cls.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <JoinClassDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onSuccess={fetchClasses}
      />
    </div>
  );
};

export default MyClasses;
