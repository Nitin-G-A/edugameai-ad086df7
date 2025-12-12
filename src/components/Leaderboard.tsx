import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Star, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  xp: number;
  level: number;
  rank: number;
}

interface ClassData {
  id: string;
  name: string;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedClass, user]);

  const fetchClasses = async () => {
    if (!user) return;

    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id);

      if (!memberships?.length) {
        setClasses([]);
        return;
      }

      const classIds = memberships.map((m) => m.class_id);

      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      setClasses(classesData || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchLeaderboard = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Use secure RPC function that only exposes non-sensitive data
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: 20 });

      if (error) {
        console.error('Failed to fetch leaderboard:', error);
        setLeaderboard([]);
        return;
      }

      // If a specific class is selected, filter by class members
      let filteredData = data || [];
      
      if (selectedClass !== 'all') {
        const { data: classMembers } = await supabase
          .from('class_members')
          .select('student_id')
          .eq('class_id', selectedClass);

        const memberIds = new Set((classMembers || []).map((m) => m.student_id));
        filteredData = filteredData.filter((entry: { user_id: string }) => memberIds.has(entry.user_id));
      } else {
        // For "all classes", filter to only show users in the same classes as current user
        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id);

        if (memberships?.length) {
          const classIds = memberships.map((m) => m.class_id);
          const { data: allMembers } = await supabase
            .from('class_members')
            .select('student_id')
            .in('class_id', classIds);

          const memberIds = new Set((allMembers || []).map((m) => m.student_id));
          filteredData = filteredData.filter((entry: { user_id: string }) => memberIds.has(entry.user_id));
        } else {
          filteredData = [];
        }
      }

      const rankedProfiles = filteredData.map((p: { user_id: string; display_name: string; xp: number; level: number }, index: number) => ({
        ...p,
        rank: index + 1,
      }));

      setLeaderboard(rankedProfiles);

      // Find user's rank
      const userEntry = rankedProfiles.find((p: LeaderboardEntry) => p.user_id === user.id);
      setUserRank(userEntry?.rank || null);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Leaderboard
          </CardTitle>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No students in leaderboard yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  entry.user_id === user?.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(entry.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {entry.display_name}
                    {entry.user_id === user?.id && (
                      <span className="text-primary ml-1">(You)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Level {entry.level}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Star className="w-3 h-3" />
                  {entry.xp} XP
                </Badge>
              </div>
            ))}
          </div>
        )}
        {userRank && userRank > 10 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Your rank: <span className="font-semibold text-foreground">#{userRank}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
