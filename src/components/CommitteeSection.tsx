import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  father_name: string | null;
  photo_url: string | null;
}

const CommitteeSection = () => {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("management_committee")
          .select("id, name, position, father_name, photo_url")
          .eq("is_current", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error("Error fetching committee members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  if (loading || members.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-tamil">
            நிர்வாகக் குழு உறுப்பினர்கள்
          </h2>
          <p className="text-muted-foreground mt-1">Management Committee Members</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
            >
              <Card className="h-full">
                <CardContent className="p-4 text-center space-y-3">
                  <div className="w-24 h-24 mx-auto">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={`${member.name} - ${member.position}`}
                        className="w-full h-full rounded-full object-cover border-2 border-primary/20"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-muted flex items-center justify-center border-2 border-primary/10">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground font-tamil">{member.name}</h3>
                    <p className="text-xs text-primary font-medium font-tamil">{member.position}</p>
                    {member.father_name && (
                      <p className="text-xs text-muted-foreground font-tamil">S/o {member.father_name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommitteeSection;
