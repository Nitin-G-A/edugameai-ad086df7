import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Zap, Flame, Star, Play, CheckCircle, XCircle, Loader2, Users, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import Leaderboard from '@/components/Leaderboard';

interface AssignedQuiz {
  id: string;
  title: string;
  difficulty: string;
  xp_reward: number;
  questions: any;
  classes: { name: string } | null;
  completed?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  xp_reward: number;
  questions: any[];
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const QuizArena = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { awardXP } = useGamification();
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState('5');
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  
  // Assigned quizzes state
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  useEffect(() => {
    fetchAssignedQuizzes();
  }, [user]);

  const fetchAssignedQuizzes = async () => {
    if (!user) return;

    try {
      // Get classes the student is enrolled in
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (!memberships?.length) {
        setAssignedQuizzes([]);
        setLoadingAssigned(false);
        return;
      }

      const classIds = memberships.map((m) => m.class_id);

      // Get quizzes assigned to those classes
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select(`*, classes (name)`)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get student's quiz submissions
      const { data: submissions } = await supabase
        .from('quiz_submissions')
        .select('quiz_id')
        .eq('student_id', user.id);

      const completedQuizIds = new Set(submissions?.map((s) => s.quiz_id) || []);

      const quizzesWithStatus = (quizzes || []).map((quiz) => ({
        ...quiz,
        completed: completedQuizIds.has(quiz.id),
      }));

      setAssignedQuizzes(quizzesWithStatus);
    } catch (error: any) {
      console.error('Error fetching assigned quizzes:', error);
    } finally {
      setLoadingAssigned(false);
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('ai-quiz-generator', {
        body: { topic, difficulty, numQuestions: parseInt(numQuestions) },
      });

      if (response.error) throw response.error;

      const quizData = response.data;
      setCurrentQuiz({
        id: crypto.randomUUID(),
        title: `${topic} Quiz`,
        topic,
        difficulty,
        xp_reward: difficulty === 'hard' ? 50 : difficulty === 'medium' ? 30 : 10,
        questions: quizData.questions,
      });
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizCompleted(false);
      toast.success('Quiz generated! Good luck!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const startAssignedQuiz = (quiz: AssignedQuiz) => {
    setCurrentQuiz({
      id: quiz.id,
      title: quiz.title,
      topic: '',
      difficulty: quiz.difficulty,
      xp_reward: quiz.xp_reward,
      questions: quiz.questions,
    });
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizCompleted(false);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswer = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const currentQuestion = currentQuiz?.questions[currentQuestionIndex] as Question;
    if (answerIndex === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < (currentQuiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizCompleted(true);
      const xpEarned = Math.round((score / (currentQuiz?.questions.length || 1)) * (currentQuiz?.xp_reward || 10));
      
      if (user && xpEarned > 0) {
        await awardXP(user.id, xpEarned, 'Quiz completed!');
        await refreshProfile();
      }

      // Save submission for assigned quizzes
      if (currentQuiz && user) {
        try {
          await supabase.from('quiz_submissions').insert({
            quiz_id: currentQuiz.id,
            student_id: user.id,
            score,
            xp_earned: xpEarned,
            answers: [],
          });
          fetchAssignedQuizzes();
        } catch (error) {
          console.error('Failed to save quiz submission:', error);
        }
      }
    }
  };

  const restartQuiz = () => {
    setCurrentQuiz(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizCompleted(false);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex] as Question | undefined;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-600';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600';
      case 'hard': return 'bg-red-500/10 text-red-600';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            Quiz Arena
          </h1>
          <p className="text-muted-foreground mt-1">
            Test your knowledge, earn XP, and climb the leaderboard!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1 py-1 px-3">
            <Flame className="w-4 h-4 text-destructive" />
            <span>{profile?.streak_days || 0} day streak</span>
          </Badge>
          <Badge variant="secondary" className="gap-1 py-1 px-3">
            <Star className="w-4 h-4 text-primary" />
            <span>{profile?.xp || 0} XP</span>
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!currentQuiz ? (
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate">Generate Quiz</TabsTrigger>
                <TabsTrigger value="assigned">
                  Assigned Quizzes
                  {assignedQuizzes.filter(q => !q.completed).length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {assignedQuizzes.filter(q => !q.completed).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generate">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Start a New Quiz
                    </CardTitle>
                    <CardDescription>
                      Enter a topic and choose difficulty to generate an AI-powered quiz
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Topic</label>
                      <Input
                        placeholder="e.g., Binary Search, French Revolution, Thermodynamics"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Number of Questions</label>
                        <Select value={numQuestions} onValueChange={setNumQuestions}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 Questions</SelectItem>
                            <SelectItem value="5">5 Questions</SelectItem>
                            <SelectItem value="10">10 Questions</SelectItem>
                            <SelectItem value="15">15 Questions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Difficulty</label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="easy">Easy (+10 XP)</SelectItem>
                            <SelectItem value="medium">Medium (+30 XP)</SelectItem>
                            <SelectItem value="hard">Hard (+50 XP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={generateQuiz} disabled={isGenerating || !topic.trim()} className="w-full gap-2">
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Quiz...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assigned">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Quizzes from Your Classes
                    </CardTitle>
                    <CardDescription>
                      Take quizzes assigned by your teachers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAssigned ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : assignedQuizzes.length === 0 ? (
                      <div className="text-center py-8">
                        <FileQuestion className="w-12 h-12 text-muted mx-auto mb-3" />
                        <p className="text-muted-foreground">No quizzes assigned yet</p>
                        <p className="text-sm text-muted-foreground">Join a class to see teacher-assigned quizzes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedQuizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{quiz.title}</h4>
                                <Badge className={getDifficultyColor(quiz.difficulty)}>
                                  {quiz.difficulty}
                                </Badge>
                                {quiz.completed && (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {quiz.classes?.name} • {quiz.questions.length} questions • +{quiz.xp_reward} XP
                              </p>
                            </div>
                            <Button
                              size="sm"
                              disabled={quiz.completed}
                              onClick={() => startAssignedQuiz(quiz)}
                            >
                              {quiz.completed ? 'Done' : 'Start'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : quizCompleted ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
                <p className="text-muted-foreground mb-6">
                  You scored {score} out of {currentQuiz.questions.length}
                </p>
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Badge variant="secondary" className="py-2 px-4 text-lg">
                    <Star className="w-5 h-5 mr-2" />
                    +{Math.round((score / currentQuiz.questions.length) * currentQuiz.xp_reward)} XP
                  </Badge>
                </div>
                <Button onClick={restartQuiz}>Take Another Quiz</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
                  </CardTitle>
                  <Badge variant="outline">
                    Score: {score}/{currentQuestionIndex + (showResult ? 1 : 0)}
                  </Badge>
                </div>
                <Progress
                  value={((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100}
                  className="h-2"
                />
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg font-medium">{currentQuestion?.question}</p>

                <div className="space-y-3">
                  {currentQuestion?.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const isSelected = index === selectedAnswer;

                    return (
                      <Button
                        key={index}
                        variant={
                          showResult
                            ? isCorrect
                              ? 'default'
                              : isSelected
                              ? 'destructive'
                              : 'outline'
                            : isSelected
                            ? 'secondary'
                            : 'outline'
                        }
                        className="w-full justify-start text-left h-auto py-3 px-4"
                        onClick={() => handleAnswer(index)}
                        disabled={showResult}
                      >
                        <span className="flex items-center gap-3">
                          {showResult && isCorrect && <CheckCircle className="w-5 h-5" />}
                          {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                          {option}
                        </span>
                      </Button>
                    );
                  })}
                </div>

                {showResult && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{currentQuestion?.explanation}</p>
                  </div>
                )}

                {showResult && (
                  <Button onClick={nextQuestion} className="w-full">
                    {currentQuestionIndex < currentQuiz.questions.length - 1
                      ? 'Next Question'
                      : 'See Results'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default QuizArena;
