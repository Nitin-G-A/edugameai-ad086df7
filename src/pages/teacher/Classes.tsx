import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Plus, Copy, Loader2, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  join_code: string;
  created_at: string;
  member_count?: number;
}

const TeacherClasses = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const classesWithCounts = await Promise.all(
        (data || []).map(async (cls) => {
          const { count } = await supabase
            .from('class_members')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);
          return { ...cls, member_count: count || 0 };
        })
      );

      setClasses(classesWithCounts);
    } catch (error: any) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClass.name.trim()) {
      toast.error('Please enter a class name');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('classes').insert([{
        name: newClass.name,
        description: newClass.description || null,
        subject: 'computer_science' as "computer_science" | "stem" | "humanities",
        teacher_id: user?.id as string,
        join_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      }]);

      if (error) throw error;

      toast.success('Class created successfully!');
      setIsDialogOpen(false);
      setNewClass({ name: '', description: '' });
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create class');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (cls: ClassData) => {
    setEditingClass(cls);
    setEditForm({
      name: cls.name,
      description: cls.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingClass) return;
    if (!editForm.name.trim()) {
      toast.error('Please enter a class name');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: editForm.name,
          description: editForm.description || null,
        })
        .eq('id', editingClass.id);

      if (error) throw error;

      toast.success('Class updated successfully!');
      setIsEditDialogOpen(false);
      setEditingClass(null);
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update class');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast.success('Class deleted successfully!');
      fetchClasses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete class');
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Join code copied!');
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
            <Users className="w-8 h-8 text-primary" />
            My Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your virtual classrooms and students
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Class Name</Label>
                <Input
                  placeholder="e.g., Introduction to Programming"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="What will students learn in this class?"
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class Name</Label>
              <Input
                placeholder="e.g., Introduction to Programming"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="What will students learn in this class?"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdate} disabled={isUpdating} className="w-full">
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Update Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first class to start teaching!
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{cls.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant="secondary">
                      {cls.member_count} students
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cls.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {cls.description}
                  </p>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Join Code</p>
                    <p className="font-mono font-bold text-lg">{cls.join_code}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyJoinCode(cls.join_code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleEdit(cls)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Class?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{cls.name}" and remove all students from it. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(cls.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
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

export default TeacherClasses;
