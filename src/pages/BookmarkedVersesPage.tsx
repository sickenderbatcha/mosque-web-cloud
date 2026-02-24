import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Pause, Trash2, Volume2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface BookmarkedVerse {
  id: string;
  verse_number: number;
  arabic_text: string;
  english_text: string;
  surah_name: string;
  surah_number: number;
  ayah_number: number;
  audio_url: string | null;
  created_at: string;
}

const BookmarkedVersesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const fetchBookmarks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quran_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookmarks.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBookmark = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('quran_bookmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBookmarks(prev => prev.filter(b => b.id !== id));
      
      // Stop audio if playing this verse
      if (playingId === id && audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
      }

      toast({
        title: 'Bookmark Removed',
        description: 'Verse has been removed from your bookmarks.'
      });
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove bookmark.',
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const togglePlay = async (bookmark: BookmarkedVerse) => {
    if (!bookmark.audio_url) return;

    // If currently playing this verse, pause it
    if (playingId === bookmark.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create new audio element
    audioRef.current = new Audio(bookmark.audio_url);
    
    audioRef.current.onended = () => {
      setPlayingId(null);
      setProgress(prev => ({ ...prev, [bookmark.id]: 0 }));
    };

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current && audioRef.current.duration) {
        const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(prev => ({ ...prev, [bookmark.id]: percent }));
      }
    };

    try {
      await audioRef.current.play();
      setPlayingId(bookmark.id);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to play audio.',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Login Required</h1>
          <p className="text-muted-foreground">Please login to view your bookmarked verses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-12 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <BookOpen className="h-12 w-12 mx-auto text-primary mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold font-tamil text-foreground mb-2">
              புக்மார்க் செய்த வசனங்கள்
            </h1>
            <p className="text-muted-foreground">Bookmarked Verses</p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bookmarks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                No Bookmarks Yet
              </h2>
              <p className="text-muted-foreground">
                Bookmark verses from the homepage to see them here.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-6 max-w-3xl mx-auto">
              {bookmarks.map((bookmark, index) => (
                <motion.div
                  key={bookmark.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
                    <CardContent className="p-6 space-y-4">
                      {/* Arabic Text */}
                      <p className="text-2xl md:text-3xl text-right font-arabic leading-loose text-foreground/90" dir="rtl">
                        {bookmark.arabic_text}
                      </p>

                      {/* English Translation */}
                      <p className="text-muted-foreground italic leading-relaxed">
                        "{bookmark.english_text}"
                      </p>

                      {/* Surah Reference */}
                      <p className="text-sm text-primary font-medium">
                        — Surah {bookmark.surah_name} ({bookmark.surah_number}:{bookmark.ayah_number})
                      </p>

                      {/* Progress bar when playing */}
                      {playingId === bookmark.id && (
                        <Progress value={progress[bookmark.id] || 0} className="h-1" />
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {bookmark.audio_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePlay(bookmark)}
                              className="gap-2"
                            >
                              {playingId === bookmark.id ? (
                                <>
                                  <Pause className="h-4 w-4" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" />
                                  Play
                                </>
                              )}
                            </Button>
                          )}
                          {playingId === bookmark.id && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Volume2 className="h-3 w-3 animate-pulse" />
                              <span>Playing...</span>
                            </div>
                          )}
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === bookmark.id}
                            >
                              {deletingId === bookmark.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Bookmark?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove this verse from your bookmarks. You can always bookmark it again later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBookmark(bookmark.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookmarkedVersesPage;
