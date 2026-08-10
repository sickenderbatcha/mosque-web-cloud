import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Droplet, Phone, MapPin, Loader2, AlertCircle, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface Donor {
  id: string;
  member_id: string;
  full_name: string;
  phone: string;
  address: string | null;
  blood_group: string;
  photo_url: string | null;
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const bloodGroupInfo: Record<string, { canDonateTo: string[]; canReceiveFrom: string[]; color: string }> = {
  "A+": { canDonateTo: ["A+", "AB+"], canReceiveFrom: ["A+", "A-", "O+", "O-"], color: "bg-red-500" },
  "A-": { canDonateTo: ["A+", "A-", "AB+", "AB-"], canReceiveFrom: ["A-", "O-"], color: "bg-red-600" },
  "B+": { canDonateTo: ["B+", "AB+"], canReceiveFrom: ["B+", "B-", "O+", "O-"], color: "bg-blue-500" },
  "B-": { canDonateTo: ["B+", "B-", "AB+", "AB-"], canReceiveFrom: ["B-", "O-"], color: "bg-blue-600" },
  "AB+": { canDonateTo: ["AB+"], canReceiveFrom: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], color: "bg-purple-500" },
  "AB-": { canDonateTo: ["AB+", "AB-"], canReceiveFrom: ["A-", "B-", "AB-", "O-"], color: "bg-purple-600" },
  "O+": { canDonateTo: ["A+", "B+", "AB+", "O+"], canReceiveFrom: ["O+", "O-"], color: "bg-green-500" },
  "O-": { canDonateTo: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], canReceiveFrom: ["O-"], color: "bg-green-600" },
};

const BloodDonorFinderPage = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_blood_donors");

      if (error) throw error;
      setDonors(data || []);
    } catch (error) {
      console.error("Error fetching donors:", error);
    } finally {
      setLoading(false);
    }
  };

  const donorsByBloodGroup = useMemo(() => {
    const grouped: Record<string, Donor[]> = {};
    bloodGroups.forEach((bg) => {
      grouped[bg] = donors.filter((d) => d.blood_group === bg);
    });
    return grouped;
  }, [donors]);

  const filteredDonors = useMemo(() => {
    if (!selectedBloodGroup) return [];
    return donorsByBloodGroup[selectedBloodGroup] || [];
  }, [selectedBloodGroup, donorsByBloodGroup]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12 bg-destructive">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Droplet className="h-14 w-14 mx-auto mb-4 text-white" />
            <h1 className="text-3xl md:text-4xl font-bold font-tamil text-white mb-2">
              இரத்த தானம் தேடுபொறி
            </h1>
            <p className="text-white/90 font-display text-lg">
              Blood Donor Finder - Emergency Contact
            </p>
          </motion.div>
        </div>
      </section>

      {/* Emergency Notice */}
      <section className="py-4 bg-destructive/10 border-b border-destructive/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">
              Select a blood group below to find available donors quickly
            </p>
          </div>
        </div>
      </section>

      {/* Blood Group Selection */}
      <section className="py-8 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-lg font-semibold mb-6">Select Blood Group Needed</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 max-w-3xl mx-auto">
              {bloodGroups.map((bg) => {
                const count = donorsByBloodGroup[bg]?.length || 0;
                const isSelected = selectedBloodGroup === bg;
                const info = bloodGroupInfo[bg];
                
                return (
                  <motion.button
                    key={bg}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedBloodGroup(isSelected ? null : bg)}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-destructive bg-destructive text-white shadow-lg"
                        : "border-border bg-card hover:border-destructive/50"
                    }`}
                  >
                    <div className="text-center">
                      <Droplet className={`h-6 w-6 mx-auto mb-1 ${isSelected ? "text-white" : "text-destructive"}`} />
                      <span className="font-bold text-lg">{bg}</span>
                      <p className={`text-xs mt-1 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                        {count} {count === 1 ? "donor" : "donors"}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Selected Blood Group Info */}
      {selectedBloodGroup && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="py-6 bg-card border-b"
        >
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm py-1 px-3">
                  <span className="text-muted-foreground mr-1">Can donate to:</span>
                  <span className="font-semibold">{bloodGroupInfo[selectedBloodGroup].canDonateTo.join(", ")}</span>
                </Badge>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  <span className="text-muted-foreground mr-1">Can receive from:</span>
                  <span className="font-semibold">{bloodGroupInfo[selectedBloodGroup].canReceiveFrom.join(", ")}</span>
                </Badge>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Donors List */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {!selectedBloodGroup ? (
            <div className="text-center py-12">
              <Droplet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Select a Blood Group</h3>
              <p className="text-muted-foreground">
                Click on a blood group above to see available donors
              </p>
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="text-center py-12">
              <Droplet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Donors Found</h3>
              <p className="text-muted-foreground">
                No registered donors with blood group {selectedBloodGroup}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h3 className="text-xl font-semibold">
                  <span className="text-destructive">{selectedBloodGroup}</span> Blood Group Donors
                </h3>
                <p className="text-muted-foreground">
                  {filteredDonors.length} {filteredDonors.length === 1 ? "donor" : "donors"} available
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {filteredDonors.map((donor, index) => (
                  <motion.div
                    key={donor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow border-l-4 border-l-destructive">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 flex-shrink-0">
                            <AvatarImage src={donor.photo_url || undefined} alt={donor.full_name} />
                            <AvatarFallback className="bg-destructive/10 text-destructive font-semibold">
                              {getInitials(donor.full_name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{donor.full_name}</h4>
                              <Badge className="bg-destructive text-white flex-shrink-0">
                                {donor.blood_group}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-sm">
                              <a
                                href={`tel:${donor.phone}`}
                                className="flex items-center gap-2 text-destructive font-medium hover:underline"
                              >
                                <Phone className="h-4 w-4" />
                                {donor.phone}
                              </a>

                              {donor.address && (
                                <div className="flex items-start gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{donor.address}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                asChild
                                size="sm"
                                className="flex-1 bg-destructive hover:bg-destructive/90"
                              >
                                <a href={`tel:${donor.phone}`}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Call
                                </a>
                              </Button>
                              <Button
                                asChild
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <a
                                  href={`https://wa.me/${donor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${donor.full_name}, I found your contact through the Blood Donor Finder. I need ${selectedBloodGroup} blood urgently. Can you help?`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  WhatsApp
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Total Donors Summary */}
      <section className="py-8 bg-muted/50 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-center font-semibold mb-4">Total Registered Donors by Blood Group</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center">
              {bloodGroups.map((bg) => (
                <div key={bg} className="p-2 rounded-lg bg-card border">
                  <span className="font-bold text-destructive">{bg}</span>
                  <p className="text-lg font-semibold">{donorsByBloodGroup[bg]?.length || 0}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-4">
              Total: <span className="font-semibold text-foreground">{donors.length}</span> registered donors
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BloodDonorFinderPage;
