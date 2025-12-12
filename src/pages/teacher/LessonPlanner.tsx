import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, Loader2, Save, Target, BookOpen, AlertTriangle, HelpCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LessonPlan {
  objectives: string[];
  activities: { title: string; description: string; duration: string }[];
  commonMistakes: string[];
  quizQuestions: { question: string; answer: string }[];
  classFlow: string;
}

const LessonPlanner = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  const [config, setConfig] = useState({
    unitName: '',
    duration: '',
    grade: '',
  });

  const handleGenerate = async () => {
    if (!config.unitName.trim()) {
      toast.error('Please enter a unit/topic name');
      return;
    }
    if (!config.duration.trim()) {
      toast.error('Please enter the duration');
      return;
    }
    if (!config.grade.trim()) {
      toast.error('Please enter the grade/class level');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('ai-lesson-planner', {
        body: {
          unitName: config.unitName,
          duration: config.duration,
          grade: config.grade,
        },
      });

      if (response.error) throw response.error;

      setLessonPlan(response.data);
      toast.success('Lesson plan generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate lesson plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!lessonPlan) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('lesson_plans').insert([{
        teacher_id: user?.id as string,
        subject: 'computer_science' as "computer_science" | "stem" | "humanities",
        unit_name: config.unitName,
        class_level: `${config.grade} - ${config.duration}`,
        objectives: lessonPlan.objectives,
        activities: lessonPlan.activities,
        common_mistakes: lessonPlan.commonMistakes,
        quiz_questions: lessonPlan.quizQuestions,
        class_flow: lessonPlan.classFlow,
      }]);

      if (error) throw error;

      toast.success('Lesson plan saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save lesson plan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="w-8 h-8 text-primary" />
          AI Lesson Planner
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate comprehensive lesson plans in seconds using AI
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Set your lesson parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Unit/Topic Name</Label>
              <Input
                placeholder="e.g., Introduction to Recursion"
                value={config.unitName}
                onChange={(e) => setConfig({ ...config, unitName: e.target.value })}
              />
            </div>
            <div>
              <Label>Duration (weeks/days)</Label>
              <Input
                placeholder="e.g., 2 weeks, 5 days"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: e.target.value })}
              />
            </div>
            <div>
              <Label>Grade/Class Level</Label>
              <Input
                placeholder="e.g., 10th std, PUC, BTech 2nd year"
                value={config.grade}
                onChange={(e) => setConfig({ ...config, grade: e.target.value })}
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Lesson Plan */}
        <div className="lg:col-span-2 space-y-4">
          {!lessonPlan ? (
            <Card className="h-full">
              <CardContent className="h-full flex items-center justify-center py-12">
                <div className="text-center">
                  <Lightbulb className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI Lesson Planner</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Configure your lesson parameters and let AI generate a comprehensive plan including objectives, activities, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </Badge>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Plan
                </Button>
              </div>

              {/* Learning Objectives */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Learning Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lessonPlan.objectives.map((obj, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="mt-0.5">
                          {index + 1}
                        </Badge>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Teaching Activities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Teaching Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lessonPlan.activities.map((activity, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{activity.title}</p>
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.duration}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Common Mistakes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Common Student Mistakes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lessonPlan.commonMistakes.map((mistake, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-destructive">•</span>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Quiz Questions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Quick Quiz Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lessonPlan.quizQuestions.map((q, index) => (
                      <div key={index} className="p-3 rounded-lg bg-muted">
                        <p className="font-medium text-sm mb-1">Q: {q.question}</p>
                        <p className="text-sm text-muted-foreground">A: {q.answer}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Class Flow */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-primary" />
                    Suggested Class Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{lessonPlan.classFlow}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonPlanner;
