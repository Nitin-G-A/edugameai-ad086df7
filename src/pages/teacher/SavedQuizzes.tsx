import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileQuestion, Loader2, Eye, Trash2, Edit, Users, Clock, FileText, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Quiz {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  questions: any;
  class_id: string | null;
  created_at: string;
  classes?: { name: string } | null;
}

interface ClassData {
  id: string;
  name: string;
}

const SavedQuizzes = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);

      setClasses(classesData || []);

      // Fetch quizzes
      const { data, error } = await supabase
        .from('quizzes')
        .select(`*, classes (name)`)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuizzes(data || []);
    } catch (error: any) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Quiz deleted');
    } catch (error: any) {
      toast.error('Failed to delete quiz');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingQuiz) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          title: editingQuiz.title,
          difficulty: editingQuiz.difficulty as 'easy' | 'medium' | 'hard',
          class_id: editingQuiz.class_id || null,
        })
        .eq('id', editingQuiz.id);

      if (error) throw error;

      await fetchData();
      setEditingQuiz(null);
      toast.success('Quiz updated');
    } catch (error: any) {
      toast.error('Failed to update quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-600';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600';
      case 'hard': return 'bg-red-500/10 text-red-600';
      default: return '';
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
          <FileQuestion className="w-8 h-8 text-primary" />
          My Quizzes
        </h1>
        <p className="text-muted-foreground mt-1">
          View, edit, and manage your created quizzes
        </p>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Quizzes Created</h3>
            <p className="text-muted-foreground">
              Create quizzes from the Quiz Generator page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {quiz.classes?.name ? (
                        <>
                          <Users className="w-3 h-3" />
                          {quiz.classes.name}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <FileQuestion className="w-4 h-4" />
                    {quiz.questions.length} questions
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(quiz.created_at), 'PP')}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* View Quiz */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedQuiz(quiz)}>
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{quiz.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        {quiz.questions.map((q: any, index: number) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <p className="font-medium mb-3">Q{index + 1}: {q.question}</p>
                              <div className="space-y-2">
                                {q.options.map((option: string, optIndex: number) => (
                                  <div
                                    key={optIndex}
                                    className={`p-2 rounded text-sm ${
                                      optIndex === q.correctAnswer
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIndex)}. {option}
                                    {optIndex === q.correctAnswer && ' ✓'}
                                  </div>
                                ))}
                              </div>
                              {q.explanation && (
                                <p className="text-sm text-muted-foreground mt-3">
                                  <strong>Explanation:</strong> {q.explanation}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Quiz */}
                  <Dialog open={editingQuiz?.id === quiz.id} onOpenChange={(open) => !open && setEditingQuiz(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingQuiz(quiz)}>
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Quiz</DialogTitle>
                      </DialogHeader>
                      {editingQuiz && (
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Title</Label>
                            <Input
                              value={editingQuiz.title}
                              onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Difficulty</Label>
                            <Select
                              value={editingQuiz.difficulty}
                              onValueChange={(value) => setEditingQuiz({ ...editingQuiz, difficulty: value as "easy" | "medium" | "hard" })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Assign to Class</Label>
                            <Select
                              value={editingQuiz.class_id || 'none'}
                              onValueChange={(value) => setEditingQuiz({ ...editingQuiz, class_id: value === 'none' ? null : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not assigned</SelectItem>
                                {classes.map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleSaveEdit} disabled={isSaving} className="w-full gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Delete Quiz */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the quiz and all student submissions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(quiz.id)}>Delete</AlertDialogAction>
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

export default SavedQuizzes;
