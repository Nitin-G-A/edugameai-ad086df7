import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Lightbulb, Loader2, Eye, Trash2, Target, BookOpen, AlertTriangle, HelpCircle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LessonPlan {
  id: string;
  unit_name: string;
  class_level: string;
  objectives: string[];
  activities: { title: string; description: string; duration: string }[];
  common_mistakes: string[];
  quiz_questions: { question: string; answer: string }[];
  class_flow: string;
  created_at: string;
}

const SavedLessonPlans = () => {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    fetchLessonPlans();
  }, [user]);

  const fetchLessonPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse JSON fields
      const parsedData = (data || []).map((plan: any) => ({
        ...plan,
        objectives: plan.objectives || [],
        activities: plan.activities || [],
        common_mistakes: plan.common_mistakes || [],
        quiz_questions: plan.quiz_questions || [],
      }));

      setLessonPlans(parsedData);
    } catch (error: any) {
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLessonPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success('Lesson plan deleted');
    } catch (error: any) {
      toast.error('Failed to delete lesson plan');
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
          <Lightbulb className="w-8 h-8 text-primary" />
          Saved Lesson Plans
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your AI-generated lesson plans
        </p>
      </div>

      {lessonPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Saved Lesson Plans</h3>
            <p className="text-muted-foreground">
              Generate and save lesson plans from the AI Lesson Planner.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessonPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.unit_name}</CardTitle>
                <CardDescription>{plan.class_level}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="w-4 h-4" />
                  {format(new Date(plan.created_at), 'PPp')}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">{plan.objectives.length} objectives</Badge>
                  <Badge variant="secondary">{plan.activities.length} activities</Badge>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedPlan(plan)}>
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{plan.unit_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 mt-4">
                        {/* Learning Objectives */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-primary" />
                            Learning Objectives
                          </h4>
                          <ul className="space-y-2">
                            {plan.objectives.map((obj, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Teaching Activities */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Teaching Activities
                          </h4>
                          <div className="space-y-3">
                            {plan.activities.map((activity, index) => (
                              <div key={index} className="p-3 rounded-lg bg-muted">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium text-sm">{activity.title}</p>
                                  <Badge variant="secondary" className="gap-1 text-xs">
                                    <Clock className="w-3 h-3" />
                                    {activity.duration}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Common Mistakes */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            Common Student Mistakes
                          </h4>
                          <ul className="space-y-1">
                            {plan.common_mistakes.map((mistake, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="text-destructive">•</span>
                                {mistake}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Quiz Questions */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <HelpCircle className="w-4 h-4 text-primary" />
                            Quick Quiz Questions
                          </h4>
                          <div className="space-y-2">
                            {plan.quiz_questions.map((q, index) => (
                              <div key={index} className="p-3 rounded-lg bg-muted">
                                <p className="font-medium text-sm mb-1">Q: {q.question}</p>
                                <p className="text-sm text-muted-foreground">A: {q.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Class Flow */}
                        {plan.class_flow && (
                          <div>
                            <h4 className="font-medium flex items-center gap-2 mb-3">
                              <Clock className="w-4 h-4 text-primary" />
                              Suggested Class Flow
                            </h4>
                            <p className="text-sm whitespace-pre-wrap">{plan.class_flow}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lesson Plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the lesson plan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedLessonPlans;
