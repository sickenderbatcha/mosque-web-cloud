import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, ChevronLeft, ChevronRight, Calendar, Loader2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import GalleryUploadDialog from "@/components/gallery/GalleryUploadDialog";

interface GalleryImage {
  id: string;
  title: string;
  title_tamil: string | null;
  description: string | null;
  image_url: string;
  event_date: string | null;
  category: string | null;
  is_featured: boolean | null;
}

const categories = [
  { id: "all", label: "All", labelTamil: "அனைத்தும்" },
  { id: "events", label: "Events", labelTamil: "நிகழ்வுகள்" },
  { id: "prayers", label: "Prayers", labelTamil: "தொழுகை" },
  { id: "celebrations", label: "Celebrations", labelTamil: "கொண்டாட்டங்கள்" },
  { id: "community", label: "Community", labelTamil: "சமூகம்" },
  { id: "general", label: "General", labelTamil: "பொது" },
];

const PhotoGalleryPage = () => {
  const { isAdmin } = useUserRole();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .neq("category", "about")
        .order("is_featured", { ascending: false })
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error fetching gallery images:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = selectedCategory === "all"
    ? images
    : images.filter((img) => img.category === selectedCategory);

  const openLightbox = (image: GalleryImage, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const goToPrevious = () => {
    const newIndex = selectedIndex === 0 ? filteredImages.length - 1 : selectedIndex - 1;
    setSelectedIndex(newIndex);
    setSelectedImage(filteredImages[newIndex]);
  };

  const goToNext = () => {
    const newIndex = selectedIndex === filteredImages.length - 1 ? 0 : selectedIndex + 1;
    setSelectedIndex(newIndex);
    setSelectedImage(filteredImages[newIndex]);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, selectedIndex]);

  return (
    <div className="min-h-screen">
      {/* Admin Upload Dialog */}
      <GalleryUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onSuccess={fetchImages}
      />

      {/* Hero Section */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Camera className="h-14 w-14 mx-auto mb-4 text-primary-foreground" />
            <h1 className="text-3xl md:text-4xl font-bold font-tamil text-primary-foreground mb-2">
              புகைப்பட தொகுப்பு
            </h1>
            <p className="text-primary-foreground/90 font-display text-lg">
              Photo Gallery - Mosque Events & Activities
            </p>
            {/* Admin Upload Button in Hero */}
            {isAdmin && (
              <Button
                onClick={() => setIsUploadDialogOpen(true)}
                className="mt-4 gap-2"
                variant="secondary"
              >
                <Plus className="h-4 w-4" />
                Add Photo
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 bg-muted/50 border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="transition-all"
              >
                <span>{cat.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-20">
              <Camera className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Photos Yet</h3>
              <p className="text-muted-foreground">
                {selectedCategory === "all"
                  ? "Gallery photos will appear here once uploaded by admins."
                  : `No photos in the "${categories.find(c => c.id === selectedCategory)?.label}" category.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card
                    className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300"
                    onClick={() => openLightbox(image, index)}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={image.image_url}
                        alt={image.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {image.title}
                        </h3>
                        {image.event_date && (
                          <p className="text-white/80 text-xs flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(image.event_date), "dd MMM yyyy")}
                          </p>
                        )}
                      </div>
                      {image.is_featured && (
                        <Badge className="absolute top-2 right-2 bg-primary">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={closeLightbox}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation */}
            {filteredImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 text-white hover:bg-white/20 h-12 w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 text-white hover:bg-white/20 h-12 w-12"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image */}
            <motion.div
              key={selectedImage.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-5xl max-h-[85vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
              <div className="text-center mt-4 text-white">
                <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
                {selectedImage.title_tamil && (
                  <p className="text-white/80 font-tamil">{selectedImage.title_tamil}</p>
                )}
                {selectedImage.description && (
                  <p className="text-white/70 mt-2 max-w-2xl mx-auto">
                    {selectedImage.description}
                  </p>
                )}
                {selectedImage.event_date && (
                  <p className="text-white/60 text-sm mt-2 flex items-center justify-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedImage.event_date), "dd MMMM yyyy")}
                  </p>
                )}
                <p className="text-white/50 text-sm mt-4">
                  {selectedIndex + 1} / {filteredImages.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotoGalleryPage;