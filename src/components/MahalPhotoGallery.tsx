import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MahalPhoto {
  name: string;
  url: string;
}

const MahalPhotoGallery = () => {
  const [photos, setPhotos] = useState<MahalPhoto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("mahal-photos")
          .list("", { sortBy: { column: "created_at", order: "desc" } });

        if (error) throw error;

        const photoList = (data || [])
          .filter((f) => f.name !== ".emptyFolderPlaceholder")
          .map((file) => ({
            name: file.name,
            url: supabase.storage.from("mahal-photos").getPublicUrl(file.name).data.publicUrl,
          }));

        setPhotos(photoList);
      } catch (error) {
        console.error("Error fetching mahal photos:", error);
      }
    };

    fetchPhotos();
  }, []);

  if (photos.length === 0) return null;

  const navigate = (dir: number) => {
    if (selectedIndex === null) return;
    const next = (selectedIndex + dir + photos.length) % photos.length;
    setSelectedIndex(next);
  };

  return (
    <>
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground">
              மண்டப புகைப்படங்கள்
            </h2>
            <p className="text-muted-foreground mt-1">Mahal Photo Gallery</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="cursor-pointer rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow aspect-[4/3]"
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={photo.url}
                  alt={`Mahal photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); navigate(1); }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={photos[selectedIndex].url}
              alt={`Mahal photo ${selectedIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-4 text-white/70 text-sm">
              {selectedIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MahalPhotoGallery;
