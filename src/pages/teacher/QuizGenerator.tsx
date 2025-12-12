import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FileQuestion, Sparkles, Loader2, Save, Eye, PenLine, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface ClassData {
  id: string;
  name: string;
}

const TeacherQuizGenerator = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');

  const [quizConfig, setQuizConfig] = useState({
    topic: '',
    difficulty: 'medium',
    numQuestions: 5,
    classId: '',
  });

  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState('');

  // Custom quiz state
  const [customQuestions, setCustomQuestions] = useState<GeneratedQuestion[]>([]);
  const [customQuizTitle, setCustomQuizTitle] = useState('');
  const [customClassId, setCustomClassId] = useState('');
  const [customDifficulty, setCustomDifficulty] = useState('medium');
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .eq('teacher_id', user.id);

    setClasses(data || []);
  };

  const handleGenerate = async () => {
    if (!quizConfig.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('ai-quiz-generator', {
        body: {
          topic: quizConfig.topic,
          difficulty: quizConfig.difficulty,
          numQuestions: quizConfig.numQuestions,
        },
      });

      if (response.error) throw response.error;

      setGeneratedQuestions(response.data.questions);
      setQuizTitle(`${quizConfig.topic} Quiz`);
      toast.success('Quiz generated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!quizTitle.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('quizzes').insert([{
        title: quizTitle,
        subject: 'computer_science' as "computer_science" | "stem" | "humanities",
        difficulty: quizConfig.difficulty as "easy" | "medium" | "hard",
        questions: generatedQuestions as unknown as import('@/integrations/supabase/types').Json,
        teacher_id: user?.id as string,
        class_id: quizConfig.classId || null,
        xp_reward: quizConfig.difficulty === 'hard' ? 50 : quizConfig.difficulty === 'medium' ? 30 : 10,
      }]);

      if (error) throw error;

      toast.success('Quiz saved successfully!');
      setGeneratedQuestions([]);
      setQuizTitle('');
      setQuizConfig({ ...quizConfig, topic: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  // Custom quiz functions
  const addCustomQuestion = () => {
    setCustomQuestions([...customQuestions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    }]);
  };

  const updateCustomQuestion = (index: number, field: keyof GeneratedQuestion, value: any) => {
    const updated = [...customQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCustomQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...customQuestions];
    updated[qIndex].options[optIndex] = value;
    setCustomQuestions(updated);
  };

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleSaveCustom = async () => {
    if (!customQuizTitle.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }
    if (customQuestions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    const incomplete = customQuestions.some(q => 
      !q.question.trim() || q.options.some(o => !o.trim())
    );
    if (incomplete) {
      toast.error('Please fill in all questions and options');
      return;
    }

    setIsSavingCustom(true);
    try {
      const { error } = await supabase.from('quizzes').insert([{
        title: customQuizTitle,
        subject: 'computer_science' as "computer_science" | "stem" | "humanities",
        difficulty: customDifficulty as "easy" | "medium" | "hard",
        questions: customQuestions as unknown as import('@/integrations/supabase/types').Json,
        teacher_id: user?.id as string,
        class_id: customClassId || null,
        xp_reward: customDifficulty === 'hard' ? 50 : customDifficulty === 'medium' ? 30 : 10,
      }]);

      if (error) throw error;

      toast.success('Custom quiz saved successfully!');
      setCustomQuestions([]);
      setCustomQuizTitle('');
      setCustomClassId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quiz');
    } finally {
      setIsSavingCustom(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileQuestion className="w-8 h-8 text-primary" />
          Quiz Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate quizzes using AI or create custom quizzes manually
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="w-4 h-4" />
            AI Generated
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <PenLine className="w-4 h-4" />
            Custom Quiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Quiz Configuration
                </CardTitle>
                <CardDescription>
                  Configure your quiz settings and let AI generate the questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Topic</Label>
                  <Input
                    placeholder="e.g., Binary Search Trees, World War II"
                    value={quizConfig.topic}
                    onChange={(e) => setQuizConfig({ ...quizConfig, topic: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={quizConfig.difficulty}
                      onValueChange={(value) => setQuizConfig({ ...quizConfig, difficulty: value })}
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
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={quizConfig.numQuestions}
                      onChange={(e) => setQuizConfig({ ...quizConfig, numQuestions: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Assign to Class (optional)</Label>
                  <Select
                    value={quizConfig.classId}
                    onValueChange={(value) => setQuizConfig({ ...quizConfig, classId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      Generate Quiz
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedQuestions.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-center">
                    <div>
                      <FileQuestion className="w-16 h-16 text-muted mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Generated questions will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Quiz Title</Label>
                      <Input
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        placeholder="Enter quiz title"
                      />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-3">
                      {generatedQuestions.map((q, index) => (
                        <div key={index} className="p-4 rounded-lg bg-muted">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">Question {index + 1}</Badge>
                          </div>
                          <p className="font-medium text-sm mb-2">{q.question}</p>
                          <div className="space-y-1">
                            {q.options.map((option, optIndex) => (
                              <p
                                key={optIndex}
                                className={`text-sm px-2 py-1 rounded ${
                                  optIndex === q.correctAnswer
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {String.fromCharCode(65 + optIndex)}. {option}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Quiz
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="w-5 h-5" />
                  Custom Quiz Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Quiz Title</Label>
                    <Input
                      placeholder="Enter quiz title"
                      value={customQuizTitle}
                      onChange={(e) => setCustomQuizTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={customDifficulty} onValueChange={setCustomDifficulty}>
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
                    <Label>Assign to Class (optional)</Label>
                    <Select value={customClassId} onValueChange={setCustomClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            {customQuestions.map((q, qIndex) => (
              <Card key={qIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => removeCustomQuestion(qIndex)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Question</Label>
                    <Textarea
                      placeholder="Enter your question"
                      value={q.question}
                      onChange={(e) => updateCustomQuestion(qIndex, 'question', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex}>
                        <Label className="flex items-center gap-2">
                          Option {String.fromCharCode(65 + optIndex)}
                          {optIndex === q.correctAnswer && (
                            <Badge variant="secondary" className="text-xs">Correct</Badge>
                          )}
                        </Label>
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          value={opt}
                          onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label>Correct Answer</Label>
                    <Select
                      value={q.correctAnswer.toString()}
                      onValueChange={(value) => updateCustomQuestion(qIndex, 'correctAnswer', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Option A</SelectItem>
                        <SelectItem value="1">Option B</SelectItem>
                        <SelectItem value="2">Option C</SelectItem>
                        <SelectItem value="3">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Explanation (optional)</Label>
                    <Textarea
                      placeholder="Explain why this is the correct answer"
                      value={q.explanation}
                      onChange={(e) => updateCustomQuestion(qIndex, 'explanation', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4">
              <Button variant="outline" onClick={addCustomQuestion} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
              {customQuestions.length > 0 && (
                <Button onClick={handleSaveCustom} disabled={isSavingCustom} className="gap-2">
                  {isSavingCustom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Custom Quiz
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherQuizGenerator;
