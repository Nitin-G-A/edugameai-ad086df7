import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Target, Loader2, AlertCircle, CheckCircle, HelpCircle, Sparkles, MessageSquare, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MistakeAnalysis {
  whatWentWrong: string;
  whyItsWrong: string;
  correctSolution: string;
  practiceQuestions: { question: string; answer: string }[];
}

const ExplainMistake = () => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MistakeAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error('Please enter both the question and your answer');
      return;
    }

    setIsAnalyzing(true);
    try {
      const wrongAnswer = `Question: ${question}\n\nMy Answer: ${answer}`;
      
      const response = await supabase.functions.invoke('ai-explain-mistake', {
        body: { wrongAnswer, subject: 'general' },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setAnalysis({
        whatWentWrong: data.whatWentWrong,
        whyItsWrong: data.whyItsWrong,
        correctSolution: data.correctSolution,
        practiceQuestions: data.practiceQuestions || [],
      });

      await supabase.from('mistake_reviews').insert({
        student_id: user?.id,
        subject: 'computer_science' as 'computer_science' | 'stem' | 'humanities',
        original_answer: wrongAnswer,
        mistake_analysis: data.whatWentWrong,
        correct_solution: data.correctSolution,
        practice_questions: data.practiceQuestions || [],
      });

      toast.success('Analysis complete!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setQuestion('');
    setAnswer('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Target className="w-8 h-8 text-primary" />
          Explain My Mistake
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter the question and your wrong answer to learn from your mistakes with AI-powered analysis
        </p>
      </div>

      {!analysis ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                Enter Your Work
              </CardTitle>
              <CardDescription>
                Provide the question and your answer separately for better analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="question" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="question" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Question
                  </TabsTrigger>
                  <TabsTrigger value="answer" className="gap-2">
                    <PenLine className="w-4 h-4" />
                    Your Answer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="question" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      The Question You Answered
                    </label>
                    <Textarea
                      placeholder="Enter the original question here...

Example: What is the time complexity of binary search?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                  </div>
                  {question && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Question entered
                    </Badge>
                  )}
                </TabsContent>

                <TabsContent value="answer" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Your Wrong Answer
                    </label>
                    <Textarea
                      placeholder="Enter your answer that was incorrect...

Example: O(n) because we check each element one by one until we find the target."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                  </div>
                  {answer && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Answer entered
                    </Badge>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-6 space-y-3">
                <div className="flex gap-2">
                  {question && (
                    <Badge variant="outline" className="gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Question ready
                    </Badge>
                  )}
                  {answer && (
                    <Badge variant="outline" className="gap-1">
                      <PenLine className="w-3 h-3" />
                      Answer ready
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !question.trim() || !answer.trim()}
                  className="w-full gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze My Mistake
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="h-full flex items-center justify-center py-12">
              <div className="text-center">
                <Target className="w-16 h-16 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Learn From Your Mistakes</h3>
                <p className="text-muted-foreground max-w-sm">
                  Our AI will analyze your wrong answer and help you understand:
                </p>
                <ul className="text-sm text-muted-foreground mt-4 space-y-2">
                  <li className="flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    What went wrong
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    Why it's incorrect
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    The correct solution
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              AI Analysis Complete
            </Badge>
            <Button variant="outline" onClick={resetAnalysis}>
              Analyze Another
            </Button>
          </div>

          <div className="grid gap-6">
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  What Went Wrong
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.whatWentWrong}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Why It's Wrong
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.whyItsWrong}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Correct Solution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{analysis.correctSolution}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Practice Questions</CardTitle>
                <CardDescription>
                  Try these similar questions to reinforce your understanding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.practiceQuestions.map((q, index) => (
                    <div key={index} className="p-4 rounded-lg bg-muted">
                      <p className="font-medium text-sm mb-2">
                        <Badge variant="outline" className="mr-2">
                          Q{index + 1}
                        </Badge>
                        {q.question}
                      </p>
                      <details className="cursor-pointer">
                        <summary className="text-sm text-primary">Show Answer</summary>
                        <p className="text-sm text-muted-foreground mt-2">{q.answer}</p>
                      </details>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplainMistake;