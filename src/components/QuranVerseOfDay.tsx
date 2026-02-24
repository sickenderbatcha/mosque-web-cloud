import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, RefreshCw, Play, Pause, Volume2, Share2, Bookmark, BookmarkCheck, List, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Surah data with names and ayah counts
const SURAHS = [
  { number: 1, name: "Al-Fatihah", ayahs: 7, startVerse: 1 },
  { number: 2, name: "Al-Baqarah", ayahs: 286, startVerse: 8 },
  { number: 3, name: "Aal-i-Imraan", ayahs: 200, startVerse: 294 },
  { number: 4, name: "An-Nisa", ayahs: 176, startVerse: 494 },
  { number: 5, name: "Al-Ma'idah", ayahs: 120, startVerse: 670 },
  { number: 6, name: "Al-An'am", ayahs: 165, startVerse: 790 },
  { number: 7, name: "Al-A'raf", ayahs: 206, startVerse: 955 },
  { number: 8, name: "Al-Anfal", ayahs: 75, startVerse: 1161 },
  { number: 9, name: "At-Tawbah", ayahs: 129, startVerse: 1236 },
  { number: 10, name: "Yunus", ayahs: 109, startVerse: 1365 },
  { number: 11, name: "Hud", ayahs: 123, startVerse: 1474 },
  { number: 12, name: "Yusuf", ayahs: 111, startVerse: 1597 },
  { number: 13, name: "Ar-Ra'd", ayahs: 43, startVerse: 1708 },
  { number: 14, name: "Ibrahim", ayahs: 52, startVerse: 1751 },
  { number: 15, name: "Al-Hijr", ayahs: 99, startVerse: 1803 },
  { number: 16, name: "An-Nahl", ayahs: 128, startVerse: 1902 },
  { number: 17, name: "Al-Isra", ayahs: 111, startVerse: 2030 },
  { number: 18, name: "Al-Kahf", ayahs: 110, startVerse: 2141 },
  { number: 19, name: "Maryam", ayahs: 98, startVerse: 2251 },
  { number: 20, name: "Ta-Ha", ayahs: 135, startVerse: 2349 },
  { number: 21, name: "Al-Anbiya", ayahs: 112, startVerse: 2484 },
  { number: 22, name: "Al-Hajj", ayahs: 78, startVerse: 2596 },
  { number: 23, name: "Al-Mu'minun", ayahs: 118, startVerse: 2674 },
  { number: 24, name: "An-Nur", ayahs: 64, startVerse: 2792 },
  { number: 25, name: "Al-Furqan", ayahs: 77, startVerse: 2856 },
  { number: 26, name: "Ash-Shu'ara", ayahs: 227, startVerse: 2933 },
  { number: 27, name: "An-Naml", ayahs: 93, startVerse: 3160 },
  { number: 28, name: "Al-Qasas", ayahs: 88, startVerse: 3253 },
  { number: 29, name: "Al-'Ankabut", ayahs: 69, startVerse: 3341 },
  { number: 30, name: "Ar-Rum", ayahs: 60, startVerse: 3410 },
  { number: 31, name: "Luqman", ayahs: 34, startVerse: 3470 },
  { number: 32, name: "As-Sajdah", ayahs: 30, startVerse: 3504 },
  { number: 33, name: "Al-Ahzab", ayahs: 73, startVerse: 3534 },
  { number: 34, name: "Saba", ayahs: 54, startVerse: 3607 },
  { number: 35, name: "Fatir", ayahs: 45, startVerse: 3661 },
  { number: 36, name: "Ya-Sin", ayahs: 83, startVerse: 3706 },
  { number: 37, name: "As-Saffat", ayahs: 182, startVerse: 3789 },
  { number: 38, name: "Sad", ayahs: 88, startVerse: 3971 },
  { number: 39, name: "Az-Zumar", ayahs: 75, startVerse: 4059 },
  { number: 40, name: "Ghafir", ayahs: 85, startVerse: 4134 },
  { number: 41, name: "Fussilat", ayahs: 54, startVerse: 4219 },
  { number: 42, name: "Ash-Shura", ayahs: 53, startVerse: 4273 },
  { number: 43, name: "Az-Zukhruf", ayahs: 89, startVerse: 4326 },
  { number: 44, name: "Ad-Dukhan", ayahs: 59, startVerse: 4415 },
  { number: 45, name: "Al-Jathiyah", ayahs: 37, startVerse: 4474 },
  { number: 46, name: "Al-Ahqaf", ayahs: 35, startVerse: 4511 },
  { number: 47, name: "Muhammad", ayahs: 38, startVerse: 4546 },
  { number: 48, name: "Al-Fath", ayahs: 29, startVerse: 4584 },
  { number: 49, name: "Al-Hujurat", ayahs: 18, startVerse: 4613 },
  { number: 50, name: "Qaf", ayahs: 45, startVerse: 4631 },
  { number: 51, name: "Adh-Dhariyat", ayahs: 60, startVerse: 4676 },
  { number: 52, name: "At-Tur", ayahs: 49, startVerse: 4736 },
  { number: 53, name: "An-Najm", ayahs: 62, startVerse: 4785 },
  { number: 54, name: "Al-Qamar", ayahs: 55, startVerse: 4847 },
  { number: 55, name: "Ar-Rahman", ayahs: 78, startVerse: 4902 },
  { number: 56, name: "Al-Waqi'ah", ayahs: 96, startVerse: 4980 },
  { number: 57, name: "Al-Hadid", ayahs: 29, startVerse: 5076 },
  { number: 58, name: "Al-Mujadila", ayahs: 22, startVerse: 5105 },
  { number: 59, name: "Al-Hashr", ayahs: 24, startVerse: 5127 },
  { number: 60, name: "Al-Mumtahanah", ayahs: 13, startVerse: 5151 },
  { number: 61, name: "As-Saf", ayahs: 14, startVerse: 5164 },
  { number: 62, name: "Al-Jumu'ah", ayahs: 11, startVerse: 5178 },
  { number: 63, name: "Al-Munafiqun", ayahs: 11, startVerse: 5189 },
  { number: 64, name: "At-Taghabun", ayahs: 18, startVerse: 5200 },
  { number: 65, name: "At-Talaq", ayahs: 12, startVerse: 5218 },
  { number: 66, name: "At-Tahrim", ayahs: 12, startVerse: 5230 },
  { number: 67, name: "Al-Mulk", ayahs: 30, startVerse: 5242 },
  { number: 68, name: "Al-Qalam", ayahs: 52, startVerse: 5272 },
  { number: 69, name: "Al-Haqqah", ayahs: 52, startVerse: 5324 },
  { number: 70, name: "Al-Ma'arij", ayahs: 44, startVerse: 5376 },
  { number: 71, name: "Nuh", ayahs: 28, startVerse: 5420 },
  { number: 72, name: "Al-Jinn", ayahs: 28, startVerse: 5448 },
  { number: 73, name: "Al-Muzzammil", ayahs: 20, startVerse: 5476 },
  { number: 74, name: "Al-Muddaththir", ayahs: 56, startVerse: 5496 },
  { number: 75, name: "Al-Qiyamah", ayahs: 40, startVerse: 5552 },
  { number: 76, name: "Al-Insan", ayahs: 31, startVerse: 5592 },
  { number: 77, name: "Al-Mursalat", ayahs: 50, startVerse: 5623 },
  { number: 78, name: "An-Naba", ayahs: 40, startVerse: 5673 },
  { number: 79, name: "An-Nazi'at", ayahs: 46, startVerse: 5713 },
  { number: 80, name: "'Abasa", ayahs: 42, startVerse: 5759 },
  { number: 81, name: "At-Takwir", ayahs: 29, startVerse: 5801 },
  { number: 82, name: "Al-Infitar", ayahs: 19, startVerse: 5830 },
  { number: 83, name: "Al-Mutaffifin", ayahs: 36, startVerse: 5849 },
  { number: 84, name: "Al-Inshiqaq", ayahs: 25, startVerse: 5885 },
  { number: 85, name: "Al-Buruj", ayahs: 22, startVerse: 5910 },
  { number: 86, name: "At-Tariq", ayahs: 17, startVerse: 5932 },
  { number: 87, name: "Al-A'la", ayahs: 19, startVerse: 5949 },
  { number: 88, name: "Al-Ghashiyah", ayahs: 26, startVerse: 5968 },
  { number: 89, name: "Al-Fajr", ayahs: 30, startVerse: 5994 },
  { number: 90, name: "Al-Balad", ayahs: 20, startVerse: 6024 },
  { number: 91, name: "Ash-Shams", ayahs: 15, startVerse: 6044 },
  { number: 92, name: "Al-Layl", ayahs: 21, startVerse: 6059 },
  { number: 93, name: "Ad-Duhaa", ayahs: 11, startVerse: 6080 },
  { number: 94, name: "Ash-Sharh", ayahs: 8, startVerse: 6091 },
  { number: 95, name: "At-Tin", ayahs: 8, startVerse: 6099 },
  { number: 96, name: "Al-'Alaq", ayahs: 19, startVerse: 6107 },
  { number: 97, name: "Al-Qadr", ayahs: 5, startVerse: 6126 },
  { number: 98, name: "Al-Bayyinah", ayahs: 8, startVerse: 6131 },
  { number: 99, name: "Az-Zalzalah", ayahs: 8, startVerse: 6139 },
  { number: 100, name: "Al-'Adiyat", ayahs: 11, startVerse: 6147 },
  { number: 101, name: "Al-Qari'ah", ayahs: 11, startVerse: 6158 },
  { number: 102, name: "At-Takathur", ayahs: 8, startVerse: 6169 },
  { number: 103, name: "Al-'Asr", ayahs: 3, startVerse: 6177 },
  { number: 104, name: "Al-Humazah", ayahs: 9, startVerse: 6180 },
  { number: 105, name: "Al-Fil", ayahs: 5, startVerse: 6189 },
  { number: 106, name: "Quraysh", ayahs: 4, startVerse: 6194 },
  { number: 107, name: "Al-Ma'un", ayahs: 7, startVerse: 6198 },
  { number: 108, name: "Al-Kawthar", ayahs: 3, startVerse: 6205 },
  { number: 109, name: "Al-Kafirun", ayahs: 6, startVerse: 6208 },
  { number: 110, name: "An-Nasr", ayahs: 3, startVerse: 6214 },
  { number: 111, name: "Al-Masad", ayahs: 5, startVerse: 6217 },
  { number: 112, name: "Al-Ikhlas", ayahs: 4, startVerse: 6222 },
  { number: 113, name: "Al-Falaq", ayahs: 5, startVerse: 6226 },
  { number: 114, name: "An-Nas", ayahs: 6, startVerse: 6231 },
];

interface WordByWord {
  arabic: string;
  translation: string;
}

interface QuranVerse {
  arabic: string;
  transliteration: string;
  tamil: string;
  english: string;
  surah: string;
  ayah: number;
  surahNumber: number;
  audioUrl: string | null;
  verseNumber: number;
  words: WordByWord[];
}

const QuranVerseOfDay = () => {
  const [verse, setVerse] = useState<QuranVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showWordByWord, setShowWordByWord] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState<string>('1');
  const [selectedAyah, setSelectedAyah] = useState<string>('1');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const currentSurah = SURAHS.find(s => s.number === parseInt(selectedSurah));
  const maxAyahs = currentSurah?.ayahs || 7;

  const goToSelectedVerse = () => {
    const surah = SURAHS.find(s => s.number === parseInt(selectedSurah));
    if (!surah) return;
    
    const ayahNum = Math.min(Math.max(1, parseInt(selectedAyah) || 1), surah.ayahs);
    const verseNumber = surah.startVerse + ayahNum - 1;
    
    fetchSpecificVerse(verseNumber);
    setPickerOpen(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkBookmarkStatus = async (verseNum: number) => {
    if (!user) {
      setIsBookmarked(false);
      return;
    }

    const { data } = await supabase
      .from('quran_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('verse_number', verseNum)
      .maybeSingle();

    setIsBookmarked(!!data);
  };

  const fetchSpecificVerse = async (verseNumber: number) => {
    setLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setIsBookmarked(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    try {
      const [arabicRes, englishRes, tamilRes, translitRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/ar.alafasy`),
        fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/en.sahih`),
        fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/ta.tamil`),
        fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/en.transliteration`)
      ]);
      
      const arabicData = await arabicRes.json();
      const englishData = await englishRes.json();
      const tamilData = await tamilRes.json();
      const translitData = await translitRes.json();
      
      // Fetch word-by-word data from Quran.com API
      let words: WordByWord[] = [];
      if (englishData.code === 200) {
        try {
          const surahNum = englishData.data.surah.number;
          const ayahNum = englishData.data.numberInSurah;
          const wordByWordRes = await fetch(
            `https://api.quran.com/api/v4/verses/by_key/${surahNum}:${ayahNum}?words=true&word_fields=text_uthmani,translation`
          );
          const wordByWordData = await wordByWordRes.json();
          if (wordByWordData?.verse?.words) {
            words = wordByWordData.verse.words
              .filter((w: any) => w.char_type_name === 'word')
              .map((w: any) => ({
                arabic: w.text_uthmani || w.text,
                translation: w.translation?.text || ''
              }));
          }
        } catch (e) {
          console.log('Word-by-word fetch failed, using fallback');
        }
      }

      // Fallback: split Arabic text into words if API failed
      if (words.length === 0 && arabicData.code === 200) {
        const arabicWords = arabicData.data.text.split(' ');
        words = arabicWords.map((word: string) => ({
          arabic: word,
          translation: ''
        }));
      }
      
      if (arabicData.code === 200 && englishData.code === 200) {
        setVerse({
          arabic: arabicData.data.text,
          transliteration: translitData.code === 200 ? translitData.data.text : '',
          tamil: tamilData.code === 200 ? tamilData.data.text : '',
          english: englishData.data.text,
          surah: englishData.data.surah.englishName,
          ayah: englishData.data.numberInSurah,
          surahNumber: englishData.data.surah.number,
          audioUrl: arabicData.data.audio || null,
          verseNumber,
          words
        });
        checkBookmarkStatus(verseNumber);
      }
    } catch (error) {
      console.error('Error fetching Quran verse:', error);
      setVerse({
        arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        transliteration: 'Bismi Allahi alrrahmani alrraheemi',
        tamil: 'அளவற்ற அருளாளனும், நிகரற்ற அன்புடையோனுமாகிய அல்லாஹ்வின் திருப்பெயரால்...',
        english: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
        surah: 'Al-Fatihah',
        ayah: 1,
        surahNumber: 1,
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
        verseNumber: 1,
        words: [
          { arabic: 'بِسْمِ', translation: 'In the name' },
          { arabic: 'اللَّهِ', translation: 'of Allah' },
          { arabic: 'الرَّحْمَٰنِ', translation: 'the Most Gracious' },
          { arabic: 'الرَّحِيمِ', translation: 'the Most Merciful' }
        ]
      });
      checkBookmarkStatus(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerse = async () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const verseNumber = (dayOfYear % 6236) + 1;
    await fetchSpecificVerse(verseNumber);
  };

  const goToPreviousVerse = () => {
    if (!verse) return;
    const prevVerse = verse.verseNumber > 1 ? verse.verseNumber - 1 : 6236;
    fetchSpecificVerse(prevVerse);
  };

  const goToNextVerse = () => {
    if (!verse) return;
    const nextVerse = verse.verseNumber < 6236 ? verse.verseNumber + 1 : 1;
    fetchSpecificVerse(nextVerse);
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to bookmark verses.',
        variant: 'destructive'
      });
      return;
    }

    if (!verse) return;

    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('quran_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('verse_number', verse.verseNumber);

        if (error) throw error;
        setIsBookmarked(false);
        toast({
          title: 'Bookmark Removed',
          description: 'Verse removed from your bookmarks.'
        });
      } else {
        const { error } = await supabase
          .from('quran_bookmarks')
          .insert({
            user_id: user.id,
            verse_number: verse.verseNumber,
            arabic_text: verse.arabic,
            english_text: verse.english,
            surah_name: verse.surah,
            surah_number: verse.surahNumber,
            ayah_number: verse.ayah,
            audio_url: verse.audioUrl
          });

        if (error) throw error;
        setIsBookmarked(true);
        toast({
          title: 'Bookmarked!',
          description: 'Verse saved to your bookmarks.'
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bookmark.',
        variant: 'destructive'
      });
    } finally {
      setBookmarkLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (!verse?.audioUrl) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(verse.audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onloadstart = () => setAudioLoading(true);
      audioRef.current.oncanplay = () => setAudioLoading(false);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setProgress(percent);
        }
      };
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setAudioLoading(true);
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      } finally {
        setAudioLoading(false);
      }
    }
  };

  const getShareText = () => {
    if (!verse) return '';
    return `📖 Quran Verse of the Day\n\n${verse.arabic}\n\n"${verse.english}"\n\n— Surah ${verse.surah} (${verse.surahNumber}:${verse.ayah})`;
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareOnFacebook = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}`, '_blank');
  };

  useEffect(() => {
    fetchVerse();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (verse && user) {
      checkBookmarkStatus(verse.verseNumber);
    }
  }, [user, verse?.verseNumber]);

  useEffect(() => {
    if (audioRef.current && verse?.audioUrl) {
      audioRef.current.src = verse.audioUrl;
      audioRef.current.load();
      setProgress(0);
    }
  }, [verse?.audioUrl]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape to close picker dialog
      if (e.key === 'Escape' && pickerOpen) {
        setPickerOpen(false);
        return;
      }

      // Arrow keys for navigation (only when dialog is closed)
      if (!pickerOpen && !loading) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPreviousVerse();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToNextVerse();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pickerOpen, loading, verse?.verseNumber]);

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-lg">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Verse of the Day</span>
            <span className="text-muted-foreground text-sm font-normal">/ இன்றைய வசனம்</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-8 w-8"
                title="View all bookmarks"
              >
                <Link to="/bookmarked-verses">
                  <List className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {verse && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleBookmark}
                  disabled={bookmarkLoading}
                  className="h-8 w-8"
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Share verse"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={shareOnWhatsApp} className="cursor-pointer">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareOnTwitter} className="cursor-pointer">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter / X
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareOnFacebook} className="cursor-pointer">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {verse?.audioUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayback}
                disabled={loading || audioLoading}
                className="h-8 w-8"
                title={isPlaying ? 'Pause recitation' : 'Play recitation'}
              >
                {audioLoading ? (
                  <Volume2 className="h-4 w-4 animate-pulse" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            )}
            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Go to specific verse"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Go to Verse</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="surah">Surah</Label>
                    <Select value={selectedSurah} onValueChange={(val) => {
                      setSelectedSurah(val);
                      setSelectedAyah('1');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Surah" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {SURAHS.map((surah) => (
                          <SelectItem key={surah.number} value={surah.number.toString()}>
                            {surah.number}. {surah.name} ({surah.ayahs} ayahs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ayah">Ayah (1-{maxAyahs})</Label>
                    <Input
                      id="ayah"
                      type="number"
                      min={1}
                      max={maxAyahs}
                      value={selectedAyah}
                      onChange={(e) => setSelectedAyah(e.target.value)}
                      placeholder={`Enter ayah number (1-${maxAyahs})`}
                    />
                  </div>
                  <Button onClick={goToSelectedVerse} className="w-full" disabled={loading}>
                    Go to Verse
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchVerse}
              disabled={loading}
              className="h-8 w-8"
              title="Today's verse"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ) : verse ? (
          <>
            {/* Word-by-word Arabic with hover translations */}
            {showWordByWord && verse.words.length > 0 ? (
              <TooltipProvider delayDuration={100}>
                <div className="flex flex-wrap justify-end gap-x-3 gap-y-2" dir="rtl">
                  {verse.words.map((word, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <span className="text-2xl md:text-3xl font-arabic leading-loose text-foreground/90 cursor-help hover:text-primary transition-colors px-1 py-0.5 rounded hover:bg-primary/10">
                          {word.arabic}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        <p className="text-sm font-medium">{word.arabic}</p>
                        {word.translation && (
                          <p className="text-xs text-muted-foreground">{word.translation}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            ) : (
              <p className="text-2xl md:text-3xl text-right font-arabic leading-loose text-foreground/90" dir="rtl">
                {verse.arabic}
              </p>
            )}
            
            {/* Toggle word-by-word */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWordByWord(!showWordByWord)}
                className="text-xs text-muted-foreground"
              >
                {showWordByWord ? 'Hide word meanings' : 'Show word meanings on hover'}
              </Button>
            </div>

            {verse.transliteration && (
              <p className="text-sm text-muted-foreground/80 italic text-center leading-relaxed">
                {verse.transliteration}
              </p>
            )}
            {verse.tamil && (
              <p className="text-muted-foreground font-tamil leading-relaxed border-l-2 border-primary/30 pl-3">
                {verse.tamil}
              </p>
            )}
            <p className="text-muted-foreground italic leading-relaxed">
              "{verse.english}"
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousVerse}
                  disabled={loading}
                  className="h-7 w-7"
                  title="Previous verse"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm text-primary font-medium">
                  — Surah {verse.surah} ({verse.surahNumber}:{verse.ayah})
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextVerse}
                  disabled={loading}
                  className="h-7 w-7"
                  title="Next verse"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {isPlaying && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  <span>Playing...</span>
                </div>
              )}
            </div>
            {(isPlaying || progress > 0) && (
              <Progress value={progress} className="h-1" />
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default QuranVerseOfDay;
