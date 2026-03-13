import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building, History, MapPin, Users, BookOpen, Loader2, Images, ChevronRight, FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLandingContent } from "@/hooks/useLandingContent";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  title_tamil: string | null;
  category: string | null;
}

const AboutPage = () => {
  const { getContent, isLoading } = useLandingContent();
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [documents, setDocuments] = useState<{ id: string; document_name: string; document_type: string; description: string | null; file_path: string; file_url: string }[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [committeeMembers, setCommitteeMembers] = useState<{ id: string; name: string; position: string; father_name: string | null; photo_url: string | null; qualification: string | null }[]>([]);
  const [loadingCommittee, setLoadingCommittee] = useState(true);
  const [mosquePhotos, setMosquePhotos] = useState<{ mosque1: string; mosque2: string }>({ mosque1: "", mosque2: "" });

  // Helper to get content with fallback
  const get = (section: string, key: string, fallback: string) => {
    return getContent(section, key) || fallback;
  };

  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const { data, error } = await supabase
          .from("gallery_images")
          .select("id, image_url, title, title_tamil, category")
          .eq("category", "about")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setGalleryImages(data || []);
      } catch (error) {
        console.error("Error fetching gallery images:", error);
      } finally {
        setLoadingGallery(false);
      }
    };

    fetchGalleryImages();

    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_pdf_documents")
          .select("id, document_name, document_type, description, file_path")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const docs = (data || []).map((doc) => {
          const { data: urlData } = supabase.storage
            .from("admin-documents")
            .getPublicUrl(doc.file_path);
          return { ...doc, file_url: urlData.publicUrl };
        });
        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();

    const fetchCommitteeMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("management_committee")
          .select("id, name, position, father_name, photo_url, qualification")
          .eq("is_current", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setCommitteeMembers(data || []);
      } catch (error) {
        console.error("Error fetching committee:", error);
      } finally {
        setLoadingCommittee(false);
      }
    };

    fetchCommitteeMembers();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold font-tamil text-primary-foreground mb-4">
              {get("about_hero", "title", "ஐ.என்.பி பற்றி")}
            </h1>
            <p className="text-primary-foreground/80 font-display text-xl">
              {get("about_hero", "subtitle", "About I.N.P. - Ilayangudi Nesavu Pattadai Tholukai Medai Pallivasal")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* History Section */}
      <section className="py-16 bg-background islamic-pattern">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <History className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground">
                {get("about_history", "heading", "தொழுகை மேடை பள்ளிவாசலின் வரலாறு")}
              </h2>
            </div>
            <div className="section-divider !mx-0 mb-8" />
            
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground font-tamil leading-relaxed mb-6">
                {get("about_history", "paragraph1", "இளையான்குடி நெசவுப் பட்டடை தொழுகை மேடைப் பள்ளிவாசல் என்பது பல தசாப்தங்களாக இளையான்குடி நெசவாளர் சமூகத்திற்கு சேவை செய்து வரும் ஒரு புனித வழிபாட்டுத் தலமாகும். இது சிவகங்கை மாவட்டத்தில் அமைந்துள்ளது.")}
              </p>
              <p className="text-muted-foreground font-tamil leading-relaxed mb-6">
                {get("about_history", "paragraph2", "நெசவாளர்களின் ஒற்றுமையையும், அவர்களின் ஆன்மீக தேவைகளையும் கருத்தில் கொண்டு இந்த பள்ளிவாசல் நிறுவப்பட்டது. இது ஐந்து வேளை தொழுகை நடத்துவதோடு, சமூக நிகழ்வுகள், கல்வி நடவடிக்கைகள், மற்றும் நலன்புரி சேவைகளையும் ஒருங்கிணைக்கிறது.")}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Two Mosques Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-4">
              {get("about_mosques", "heading", "எங்கள் இரண்டு பள்ளிவாசல்கள்")}
            </h2>
            <p className="text-muted-foreground font-display">
              {get("about_mosques", "heading_en", "Our Two Mosques")}
            </p>
            <div className="section-divider mt-6" />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-card shadow-medium">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Building className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-tamil text-xl">
                    {get("about_mosques", "mosque1_title", "தொழுகை மேடை பள்ளிவாசல்")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-tamil leading-relaxed">
                    {get("about_mosques", "mosque1_description", "இது எங்கள் முக்கிய பள்ளிவாசலாகும். ஐந்து வேளை தொழுகை, ஜும்மா தொழுகை, மற்றும் சிறப்பு நிகழ்வுகள் இங்கே நடத்தப்படுகின்றன. திருமண நிகழ்ச்சிகள் மற்றும் மற்ற சமூக நிகழ்வுகளுக்கான மண்டபமும் இங்கே உள்ளது.")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-card shadow-medium">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                    <Building className="h-7 w-7 text-secondary" />
                  </div>
                  <CardTitle className="font-tamil text-xl">
                    {get("about_mosques", "mosque2_title", "ஜுமுஆ பள்ளிவாசல்")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-tamil leading-relaxed">
                    {get("about_mosques", "mosque2_description", "சமூகத்தின் தேவைகளை பூர்த்தி செய்வதற்காக இந்த துணை பள்ளிவாசல் நிறுவப்பட்டது. இது தினசரி தொழுகைகள் மற்றும் மத கல்வி வகுப்புகளுக்காக பயன்படுத்தப்படுகிறது.")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Wakf Assets Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground">
                {get("about_wakf", "heading", "வக்ஃப் சொத்துக்கள்")}
              </h2>
            </div>
            <div className="section-divider !mx-0 mb-8" />
            
            <Card className="bg-gradient-card shadow-medium">
              <CardContent className="pt-6">
                <p className="text-muted-foreground font-tamil leading-relaxed mb-6">
                  {get("about_wakf", "description", "எங்கள் பள்ளிவாசலுக்கு பல்வேறு வக்ஃப் சொத்துக்கள் உள்ளன. இவை சமூகத்தின் நலனுக்காக பயன்படுத்தப்படுகின்றன. வக்ஃப் சொத்துக்களில் இருந்து கிடைக்கும் வருமானம் பள்ளிவாசலின் பராமரிப்பு, கல்வி நடவடிக்கைகள், மற்றும் சமூக நலன்புரி செயல்பாடுகளுக்கு பயன்படுத்தப்படுகிறது.")}
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-tamil text-sm text-muted-foreground">
                      {get("about_wakf", "asset1", "நிலங்கள்")}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-secondary/10 rounded-xl">
                    <Building className="h-6 w-6 mx-auto mb-2 text-secondary" />
                    <p className="font-tamil text-sm text-muted-foreground">
                      {get("about_wakf", "asset2", "கட்டிடங்கள்")}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-accent/10 rounded-xl">
                    <Users className="h-6 w-6 mx-auto mb-2 text-accent" />
                    <p className="font-tamil text-sm text-muted-foreground">
                      {get("about_wakf", "asset3", "மண்டபங்கள்")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Documents Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground">
                ஆவணங்கள்
              </h2>
            </div>
            <p className="text-muted-foreground font-display">
              Documents
            </p>
            <div className="section-divider mt-6" />
          </motion.div>

          {loadingDocuments ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No documents available yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {documents.map((doc, index) => {
                const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.file_path);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-card shadow-soft hover:shadow-medium transition-shadow h-full">
                      <CardContent className="p-5 flex flex-col h-full">
                        {isImage ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-3 rounded-lg overflow-hidden"
                          >
                            <img
                              src={doc.file_url}
                              alt={doc.document_name}
                              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </a>
                        ) : (
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground text-sm truncate">
                                {doc.document_name}
                              </h3>
                              <p className="text-xs text-muted-foreground capitalize">
                                {doc.document_type.replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>
                        )}
                        {isImage && (
                          <h3 className="font-semibold text-foreground text-sm mb-1 truncate">
                            {doc.document_name}
                          </h3>
                        )}
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        {!isImage && (
                          <div className="mt-auto pt-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                            >
                              <Eye className="h-4 w-4" />
                              பார்வையிட / View
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Management Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground mb-4">
              {get("about_management", "heading", "நிர்வாகக் குழு")}
            </h2>
            <p className="text-muted-foreground font-display">
              {get("about_management", "heading_en", "Management Committee")}
            </p>
            <div className="section-divider mt-6" />
          </motion.div>

          {loadingCommittee ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : committeeMembers.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-6xl mx-auto">
              {committeeMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="text-center p-6 bg-card shadow-soft hover:shadow-medium transition-shadow">
                    {member.photo_url ? (
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-primary/20">
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                    )}
                    <h3 className="font-tamil font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-primary font-medium">{member.position}</p>
                    {member.father_name && (
                      <p className="text-xs text-muted-foreground mt-1">S/o {member.father_name}</p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-6xl mx-auto">
              {[
                { role: "தலைவர்", roleEn: "Trustee" },
                { role: "துணைத் தலைவர்", roleEn: "Deputy Trustee" },
                { role: "செயலாளர்", roleEn: "Secretary" },
                { role: "துணைச் செயலாளர்", roleEn: "Deputy Secretary" },
                { role: "பொருளாளர்", roleEn: "Treasurer" },
              ].map((member, index) => (
                <motion.div
                  key={member.role}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="text-center p-6 bg-card shadow-soft hover:shadow-medium transition-shadow">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="font-tamil font-semibold text-foreground">{member.role}</h3>
                    <p className="text-sm text-muted-foreground">{member.roleEn}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Photo Gallery Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Images className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold font-tamil text-foreground">
                புகைப்படங்கள்
              </h2>
            </div>
            <p className="text-muted-foreground font-display">
              Photo Gallery
            </p>
            <div className="section-divider mt-6" />
          </motion.div>

          {loadingGallery ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : galleryImages.length === 0 ? (
            <div className="text-center py-12">
              <Images className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No photos available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {galleryImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={image.image_url}
                    alt={image.title || image.title_tamil || "Gallery image"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-sm font-tamil truncate">
                        {image.title_tamil || image.title || ""}
                      </p>
                      {image.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded text-xs text-white/80">
                          {image.category}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
