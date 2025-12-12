import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Users, Brain, Trophy, BookOpen, Sparkles, Target, Zap } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <nav className="relative container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">EduGame AI</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </nav>

        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Learning Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Learn Smarter,<br />
            <span className="text-primary">Teach Better</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A gamified educational platform that bridges the gap between students and teachers with AI-powered tools, interactive quizzes, and personalized learning paths.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?role=student">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <BookOpen className="w-5 h-5" />
                I'm a Student
              </Button>
            </Link>
            <Link to="/auth?role=teacher">
              <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                <Users className="w-5 h-5" />
                I'm a Teacher
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Powerful Features for Everyone</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you're learning or teaching, EduGame AI has the tools you need to succeed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Doubt Solver</h3>
                <p className="text-muted-foreground text-sm">
                  Get instant, step-by-step explanations for any academic question.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Explain My Mistake</h3>
                <p className="text-muted-foreground text-sm">
                  Upload wrong answers and learn from your mistakes with AI analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Quiz Arena</h3>
                <p className="text-muted-foreground text-sm">
                  Compete with classmates, earn XP, and climb the leaderboard.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Lesson Planner</h3>
                <p className="text-muted-foreground text-sm">
                  Teachers can generate complete lesson plans in seconds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">AI-Powered</div>
              <div className="text-muted-foreground">Smart Learning Tools</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">Gamified</div>
              <div className="text-muted-foreground">XP, Levels & Rewards</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">Interactive</div>
              <div className="text-muted-foreground">Virtual Classrooms</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join EduGame AI today and experience the future of education.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 EduGame AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
