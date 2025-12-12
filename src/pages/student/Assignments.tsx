import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardList, Clock, Send, FileText, Loader2, Download, ExternalLink, Upload, X, File, CheckCircle, Star } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  deadline: string;
  max_points: number;
  file_url: string | null;
  classes: {
    name: string;
    subject: string;
  };
  submission?: {
    id: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    submitted_at: string;
    file_url: string | null;
  };
}

const StudentAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (!memberships?.length) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const classIds = memberships.map((m) => m.class_id);

      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`*, classes (name, subject)`)
        .in('class_id', classIds)
        .order('deadline', { ascending: true });

      if (error) throw error;

      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentsData?.map((a) => a.id) || []);

      const assignmentsWithSubmissions = assignmentsData?.map((assignment) => ({
        ...assignment,
        submission: submissions?.find((s) => s.assignment_id === assignment.id),
      })) || [];

      setAssignments(assignmentsWithSubmissions);
    } catch (error: any) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
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
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, Word, PowerPoint, or image files only');
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
      const fileName = `submissions/${user.id}/${Date.now()}.${fileExt}`;

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

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    
    if (!submissionContent.trim() && !uploadedFile) {
      toast.error('Please enter your submission or upload a file');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl: string | null = null;
      
      if (uploadedFile) {
        fileUrl = await uploadFile();
      }

      const { error } = await supabase.from('assignment_submissions').insert({
        assignment_id: selectedAssignment.id,
        student_id: user?.id,
        content: submissionContent || null,
        file_url: fileUrl,
        status: 'submitted',
      });

      if (error) throw error;

      toast.success('Assignment submitted successfully!');
      setSubmissionContent('');
      setUploadedFile(null);
      setSelectedAssignment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.submission?.status === 'graded') {
      return (
        <Badge className="bg-primary gap-1">
          <Star className="w-3 h-3" />
          {assignment.submission.grade}/{assignment.max_points}
        </Badge>
      );
    }
    if (assignment.submission?.status === 'submitted') {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Submitted
        </Badge>
      );
    }
    if (isPast(new Date(assignment.deadline))) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'DOC';
    if (ext === 'ppt' || ext === 'pptx') return 'PPT';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'IMG';
    return 'FILE';
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
          <ClipboardList className="w-8 h-8 text-primary" />
          Assignments
        </h1>
        <p className="text-muted-foreground mt-1">
          View and submit your class assignments
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
            <p className="text-muted-foreground">
              Join a class to see assignments from your teachers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>
                      {assignment.classes?.name} • {assignment.classes?.subject}
                    </CardDescription>
                  </div>
                  {getStatusBadge(assignment)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {assignment.instructions}
                </p>

                {/* Attached File */}
                {assignment.file_url && (
                  <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Assignment File</p>
                          <p className="text-xs text-muted-foreground">
                            {getFileIcon(assignment.file_url)} document attached
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={assignment.file_url} download>
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Due {formatDistanceToNow(new Date(assignment.deadline), { addSuffix: true })}
                    </span>
                    <span className="text-muted-foreground">
                      ({format(new Date(assignment.deadline), 'PPp')})
                    </span>
                  </div>
                  {!assignment.submission && !isPast(new Date(assignment.deadline)) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setSelectedAssignment(assignment)}
                        >
                          Submit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Submit Assignment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">{assignment.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {assignment.instructions}
                            </p>
                          </div>
                          
                          <div>
                            <Label>Your Answer (Text)</Label>
                            <Textarea
                              placeholder="Enter your submission here..."
                              value={submissionContent}
                              onChange={(e) => setSubmissionContent(e.target.value)}
                              className="min-h-[150px]"
                            />
                          </div>

                          <div>
                            <Label>Or Upload File (Image, PDF, Word, PPT)</Label>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                              onChange={handleFileChange}
                              className="hidden"
                              id="submission-file"
                            />
                            {!uploadedFile ? (
                              <label
                                htmlFor="submission-file"
                                className="flex items-center justify-center w-full h-16 mt-2 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Upload className="w-5 h-5" />
                                  <span className="text-sm">Click to upload (max 10MB)</span>
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

                          <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || isUploading}
                            className="w-full gap-2"
                          >
                            {isSubmitting || isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            {isUploading ? 'Uploading...' : 'Submit Assignment'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Show grade and feedback */}
                {assignment.submission?.status === 'graded' && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <Star className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-semibold text-lg">
                          Grade: {assignment.submission.grade}/{assignment.max_points}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round((assignment.submission.grade! / assignment.max_points) * 100)}% score
                        </p>
                      </div>
                    </div>
                    {assignment.submission.feedback && (
                      <div className="p-4 rounded-lg bg-muted border">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Teacher Feedback:
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {assignment.submission.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Show submission status for pending review */}
                {assignment.submission?.status === 'submitted' && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Your submission is pending review by your teacher.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
