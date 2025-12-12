import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Plus, Loader2, FileText, Clock, Users, Upload, X, File, Eye, Sparkles, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  deadline: string;
  max_points: number;
  created_at: string;
  file_url: string | null;
  classes: {
    name: string;
  };
  submission_count?: number;
}

interface Submission {
  id: string;
  content: string | null;
  file_url: string | null;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  student_id: string;
  profiles?: { full_name: string } | null;
}

interface ClassData {
  id: string;
  name: string;
}

const TeacherAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    instructions: '',
    classId: '',
    deadline: '',
    maxPoints: 100,
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);

      setClasses(classesData || []);

      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`*, classes (name)`)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);
          return { ...assignment, submission_count: count || 0 };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error: any) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const studentIds = [...new Set(data?.map(s => s.student_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const submissionsWithProfiles = (data || []).map(sub => ({
        ...sub,
        profiles: profileMap.get(sub.student_id) || null,
      }));

      setSubmissions(submissionsWithProfiles);
    } catch (error: any) {
      toast.error('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, Word, or PowerPoint files only');
      return;
    }

    setUploadedFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!uploadedFile || !user) return null;

    setIsUploading(true);
    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAssignment.title.trim() || !newAssignment.classId || !newAssignment.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      let fileUrl: string | null = null;
      
      if (uploadedFile) {
        fileUrl = await uploadFile();
      }

      const { error } = await supabase.from('assignments').insert({
        title: newAssignment.title,
        instructions: newAssignment.instructions,
        class_id: newAssignment.classId,
        teacher_id: user?.id,
        deadline: newAssignment.deadline,
        max_points: newAssignment.maxPoints,
        file_url: fileUrl,
      });

      if (error) throw error;

      toast.success('Assignment created successfully!');
      setIsDialogOpen(false);
      setNewAssignment({
        title: '',
        instructions: '',
        classId: '',
        deadline: '',
        maxPoints: 100,
      });
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create assignment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGradeWithAI = async (submission: Submission) => {
    if (!selectedAssignment) return;

    setGradingId(submission.id);
    try {
      const { data, error } = await supabase.functions.invoke('ai-grade-assignment', {
        body: {
          assignmentTitle: selectedAssignment.title,
          instructions: selectedAssignment.instructions,
          studentSubmission: submission.content || 'No text content provided. Student submitted a file.',
          maxPoints: selectedAssignment.max_points,
        },
      });

      if (error) throw error;

      // Update the submission with grade and feedback
      const { error: updateError } = await supabase
        .from('assignment_submissions')
        .update({
          grade: data.grade,
          feedback: data.feedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success('Assignment graded successfully!');
      fetchSubmissions(selectedAssignment.id);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to grade assignment');
    } finally {
      setGradingId(null);
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
            <ClipboardList className="w-8 h-8 text-primary" />
            Assignments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage assignments for your classes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={classes.length === 0}>
              <Plus className="w-4 h-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g., Week 3 Problem Set"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  placeholder="Describe what students need to do..."
                  value={newAssignment.instructions}
                  onChange={(e) =>
                    setNewAssignment({ ...newAssignment, instructions: e.target.value })
                  }
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <Label>Upload Questions (PDF, Word, PPT)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="assignment-file"
                />
                {!uploadedFile ? (
                  <label
                    htmlFor="assignment-file"
                    className="flex items-center justify-center w-full h-20 mt-2 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm">Click to upload file (max 10MB)</span>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 mt-2 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <File className="w-5 h-5 text-primary" />
                      <span className="text-sm truncate max-w-[200px]">{uploadedFile.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeFile}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Class</Label>
                <Select
                  value={newAssignment.classId}
                  onValueChange={(value) => setNewAssignment({ ...newAssignment, classId: value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="datetime-local"
                    value={newAssignment.deadline}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, deadline: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Max Points</Label>
                  <Input
                    type="number"
                    value={newAssignment.maxPoints}
                    onChange={(e) =>
                      setNewAssignment({ ...newAssignment, maxPoints: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={isCreating || isUploading} className="w-full">
                {isCreating || isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isUploading ? 'Uploading...' : 'Create Assignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">Create a Class First</h3>
            <p className="text-muted-foreground">
              You need to create a class before you can create assignments.
            </p>
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first assignment to get started.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">All Assignments</TabsTrigger>
            <TabsTrigger value="grading">Grade Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-4">
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{assignment.title}</CardTitle>
                        <CardDescription>{assignment.classes?.name}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignment.file_url && (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="w-3 h-3" />
                            Attachment
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {assignment.submission_count} submissions
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {assignment.instructions}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Due {format(new Date(assignment.deadline), 'PPp')}
                        </div>
                        <div>{assignment.max_points} points</div>
                      </div>
                      {assignment.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                            View File
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="grading" className="mt-4">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium mb-3">Select Assignment</h3>
                {assignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className={`cursor-pointer transition-colors hover:border-primary ${
                      selectedAssignment?.id === assignment.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      fetchSubmissions(assignment.id);
                    }}
                  >
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.submission_count} submissions
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="lg:col-span-2">
                {!selectedAssignment ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Eye className="w-12 h-12 mx-auto mb-3 text-muted" />
                      <p className="text-muted-foreground">
                        Select an assignment to view and grade submissions
                      </p>
                    </CardContent>
                  </Card>
                ) : loadingSubmissions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : submissions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted" />
                      <p className="text-muted-foreground">
                        No submissions yet for this assignment
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-medium">Submissions for {selectedAssignment.title}</h3>
                    {submissions.map((submission) => (
                      <Card key={submission.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium">
                                {submission.profiles?.full_name || 'Unknown Student'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted {format(new Date(submission.submitted_at), 'PPp')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {submission.status === 'graded' ? (
                                <Badge className="gap-1 bg-primary">
                                  <CheckCircle className="w-3 h-3" />
                                  {submission.grade}/{selectedAssignment.max_points}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending Review</Badge>
                              )}
                            </div>
                          </div>

                          {submission.content && (
                            <div className="p-3 rounded-lg bg-muted/50 mb-3">
                              <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                            </div>
                          )}

                          {submission.file_url && (
                            <div className="mb-3">
                              <Button variant="outline" size="sm" asChild>
                                <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="w-4 h-4 mr-1" />
                                  View Submitted File
                                </a>
                              </Button>
                            </div>
                          )}

                          {submission.feedback && (
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                              <p className="text-xs font-medium text-primary mb-1">AI Feedback:</p>
                              <p className="text-sm">{submission.feedback}</p>
                            </div>
                          )}

                          {submission.status !== 'graded' && (
                            <Button
                              size="sm"
                              onClick={() => handleGradeWithAI(submission)}
                              disabled={gradingId === submission.id}
                              className="gap-2"
                            >
                              {gradingId === submission.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                              Grade with AI
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default TeacherAssignments;
