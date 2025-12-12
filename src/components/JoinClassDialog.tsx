import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const JoinClassDialog = ({ open, onOpenChange, onSuccess }: JoinClassDialogProps) => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.length !== 6) {
      toast.error('Please enter a valid 6-character join code');
      return;
    }

    setIsJoining(true);
    try {
      // Use secure RPC function to lookup class by join code
      const { data: classData, error: classError } = await supabase
        .rpc('lookup_class_by_code', { code: joinCode.toUpperCase() })
        .single();

      if (classError || !classData) {
        throw new Error('Class not found. Please check the code and try again.');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.class_id)
        .eq('student_id', user?.id)
        .single();

      if (existingMember) {
        throw new Error('You are already a member of this class.');
      }

      // Join the class
      const { error: joinError } = await supabase.from('class_members').insert([{
        class_id: classData.class_id,
        student_id: user?.id as string,
      }]);

      if (joinError) throw joinError;

      toast.success(`Successfully joined "${classData.class_name}"!`);
      setJoinCode('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join class');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Join a Class
          </DialogTitle>
          <DialogDescription>
            Enter the 6-character code provided by your teacher to join their class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="join-code">Class Code</Label>
            <Input
              id="join-code"
              placeholder="Enter code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest uppercase"
            />
          </div>
          <Button onClick={handleJoin} disabled={isJoining || joinCode.length !== 6} className="w-full">
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              'Join Class'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinClassDialog;
