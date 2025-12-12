import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Loader2, Target, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StudyPlan {
  id: string;
  title: string;
  subject: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
}

const StudyPlanner = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newPlan, setNewPlan] = useState({
    title: '',
    subject: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '',
    duration_minutes: 60,
  });

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('student_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast.error('Failed to load study plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPlan.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const { error } = await supabase.from('study_plans').insert([{
        student_id: user?.id as string,
        title: newPlan.title,
        subject: (newPlan.subject || null) as "computer_science" | "stem" | "humanities" | null,
        scheduled_date: newPlan.scheduled_date,
        scheduled_time: newPlan.scheduled_time || null,
        duration_minutes: newPlan.duration_minutes,
      }]);

      if (error) throw error;

      toast.success('Study plan created!');
      setIsDialogOpen(false);
      setNewPlan({
        title: '',
        subject: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '',
        duration_minutes: 60,
      });
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create plan');
    }
  };

  const toggleComplete = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('study_plans')
        .update({ is_completed: !currentStatus })
        .eq('id', planId);

      if (error) throw error;
      fetchPlans();
    } catch (error: any) {
      toast.error('Failed to update plan');
    }
  };

  const groupedPlans = plans.reduce((acc, plan) => {
    const date = plan.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(plan);
    return acc;
  }, {} as Record<string, StudyPlan[]>);

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
            <Calendar className="w-8 h-8 text-primary" />
            Study Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan your study sessions and track your progress
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Study Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Study Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>What do you want to study?</Label>
                <Input
                  placeholder="e.g., Review Chapter 5"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Select
                  value={newPlan.subject}
                  onValueChange={(value) => setNewPlan({ ...newPlan, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer_science">Computer Science</SelectItem>
                    <SelectItem value="stem">STEM</SelectItem>
                    <SelectItem value="humanities">Humanities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newPlan.scheduled_date}
                    onChange={(e) => setNewPlan({ ...newPlan, scheduled_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time (optional)</Label>
                  <Input
                    type="time"
                    value={newPlan.scheduled_time}
                    onChange={(e) => setNewPlan({ ...newPlan, scheduled_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newPlan.duration_minutes}
                  onChange={(e) => setNewPlan({ ...newPlan, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Study Plans Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first study plan to stay organized!
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Study Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPlans).map(([date, datePlans]) => (
            <div key={date}>
              <h3 className="text-lg font-semibold mb-3">
                {format(new Date(date), 'EEEE, MMMM d')}
              </h3>
              <div className="space-y-2">
                {datePlans.map((plan) => (
                  <Card key={plan.id} className={plan.is_completed ? 'opacity-60' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={plan.is_completed}
                          onCheckedChange={() => toggleComplete(plan.id, plan.is_completed)}
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${plan.is_completed ? 'line-through' : ''}`}>
                            {plan.title}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {plan.subject && <span>{plan.subject}</span>}
                            {plan.scheduled_time && <span>{plan.scheduled_time}</span>}
                            {plan.duration_minutes && <span>{plan.duration_minutes} min</span>}
                          </div>
                        </div>
                        {plan.is_completed && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
