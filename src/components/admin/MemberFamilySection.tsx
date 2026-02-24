import { useState, useEffect } from "react";
import { differenceInYears, parse, isValid, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users, Heart, UserMinus, Calendar } from "lucide-react";

type FamilyRelationship = "கணவன்" | "மனைவி" | "மகன்" | "மகள்";
type MaritalStatus = "திருமணமாகாதவர்" | "திருமணமானவர்" | "விவாகரத்தானவர்" | "விதவை/விதுரர்";

interface FamilyMember {
  id: string;
  member_id: string;
  name: string;
  relationship: FamilyRelationship;
  marital_status: MaritalStatus | null;
  is_alive: boolean;
  address: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

interface MemberFamilySectionProps {
  memberId: string;
  memberAddress: string | null;
}

const RELATIONSHIPS: FamilyRelationship[] = ["கணவன்", "மனைவி", "மகன்", "மகள்"];
const MARITAL_STATUSES: MaritalStatus[] = ["திருமணமாகாதவர்", "திருமணமானவர்", "விவாகரத்தானவர்", "விதவை/விதுரர்"];

const MemberFamilySection = ({ memberId, memberAddress }: MemberFamilySectionProps) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [useMemberAddress, setUseMemberAddress] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    relationship: "" as FamilyRelationship | "",
    marital_status: "" as MaritalStatus | "",
    is_alive: true,
    address: "",
    phone_number: "",
    date_of_birth: "",
  });

  useEffect(() => {
    fetchFamilyMembers();
  }, [memberId]);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gb_family_members")
      .select("*")
      .eq("member_id", memberId)
      .order("relationship", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching family members",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFamilyMembers((data as FamilyMember[]) || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      relationship: "",
      marital_status: "",
      is_alive: true,
      address: "",
      phone_number: "",
      date_of_birth: "",
    });
    setEditingMember(null);
    setUseMemberAddress(false);
  };

  const openEditDialog = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      relationship: member.relationship,
      marital_status: member.marital_status || "",
      is_alive: member.is_alive,
      address: member.address || "",
      phone_number: member.phone_number || "",
      date_of_birth: member.date_of_birth || "",
    });
    setUseMemberAddress(member.address === memberAddress && !!memberAddress);
    setDialogOpen(true);
  };

  const handleUseMemberAddressChange = (checked: boolean) => {
    setUseMemberAddress(checked);
    if (checked && memberAddress) {
      setFormData((prev) => ({ ...prev, address: memberAddress }));
    } else if (!checked) {
      setFormData((prev) => ({ ...prev, address: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.relationship) {
      toast({
        title: "Relationship required",
        description: "Please select a relationship type.",
        variant: "destructive",
      });
      return;
    }

    const familyData = {
      member_id: memberId,
      name: formData.name,
      relationship: formData.relationship as FamilyRelationship,
      marital_status: formData.marital_status || null,
      is_alive: formData.is_alive,
      address: formData.address || null,
      phone_number: formData.phone_number || null,
      date_of_birth: formData.date_of_birth || null,
    };

    if (editingMember) {
      const { error } = await supabase
        .from("gb_family_members")
        .update(familyData)
        .eq("id", editingMember.id);

      if (error) {
        toast({
          title: "Error updating family member",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Family member updated successfully" });
        fetchFamilyMembers();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("gb_family_members").insert(familyData);

      if (error) {
        toast({
          title: "Error adding family member",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Family member added successfully" });
        fetchFamilyMembers();
        setDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (familyMemberId: string) => {
    const { error } = await supabase
      .from("gb_family_members")
      .delete()
      .eq("id", familyMemberId);

    if (error) {
      toast({
        title: "Error deleting family member",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Family member deleted" });
      fetchFamilyMembers();
    }
  };

  const getRelationshipIcon = (relationship: FamilyRelationship) => {
    switch (relationship) {
      case "கணவன்":
        return <Heart className="h-4 w-4 text-blue-500" />;
      case "மனைவி":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "மகன்":
        return <Users className="h-4 w-4 text-green-500" />;
      case "மகள்":
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRelationshipColor = (relationship: FamilyRelationship) => {
    switch (relationship) {
      case "கணவன்":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "மனைவி":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "மகன்":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "மகள்":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "";
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          குடும்ப உறுப்பினர்கள் / Family Members
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              குடும்ப உறுப்பினர் சேர்க்க
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "குடும்ப உறுப்பினரைத் திருத்தவும் / Edit Family Member" : "குடும்ப உறுப்பினர் சேர்க்க / Add Family Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">பெயர் / Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="relationship">உறவு முறை / Relationship *</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value: FamilyRelationship) =>
                    setFormData((prev) => ({ ...prev, relationship: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="உறவு முறையைத் தேர்ந்தெடுக்கவும்" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="marital_status">திருமண நிலை / Marital Status</Label>
                <Select
                  value={formData.marital_status}
                  onValueChange={(value: MaritalStatus) =>
                    setFormData((prev) => ({ ...prev, marital_status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="திருமண நிலையைத் தேர்ந்தெடுக்கவும்" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_alive"
                  checked={formData.is_alive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_alive: checked }))
                  }
                />
                <Label htmlFor="is_alive">
                  {formData.is_alive ? "உயிருடன் உள்ளார் (Alive)" : "இறந்துவிட்டார் (Deceased)"}
                </Label>
              </div>

              <div>
                <Label htmlFor="date_of_birth">பிறந்த தேதி / Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                  }
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    if (!raw) return;
                    // Parse dd/mm/yyyy or dd-mm-yyyy
                    let parsed = parse(raw, "dd/MM/yyyy", new Date());
                    if (!isValid(parsed)) {
                      parsed = parse(raw, "dd-MM-yyyy", new Date());
                    }
                    if (isValid(parsed)) {
                      // Convert to ISO format for storage
                      setFormData((prev) => ({ ...prev, date_of_birth: format(parsed, "yyyy-MM-dd") }));
                    }
                  }}
                  placeholder="dd/mm/yyyy அல்லது dd-mm-yyyy"
                />
              </div>

              <div>
                <Label htmlFor="phone_number">தொலைபேசி எண் / Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone_number: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                {memberAddress && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use_member_address"
                      checked={useMemberAddress}
                      onCheckedChange={handleUseMemberAddressChange}
                    />
                    <Label htmlFor="use_member_address" className="text-sm text-muted-foreground">
                      உறுப்பினரின் முகவரியைப் பயன்படுத்தவும்
                    </Label>
                  </div>
                )}
                <div>
                  <Label htmlFor="address">முகவரி / Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    disabled={useMemberAddress}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMember ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : familyMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No family members added yet</p>
            <p className="text-sm">Click "Add Family Member" to add family records</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {familyMembers.map((member) => (
              <Card key={member.id} className={`relative ${!member.is_alive ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getRelationshipIcon(member.relationship)}
                        <span className="font-medium">{member.name}</span>
                        {!member.is_alive && (
                          <Badge variant="secondary" className="text-xs">
                            <UserMinus className="h-3 w-3 mr-1" />
                            Deceased
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getRelationshipColor(member.relationship)}>
                            {member.relationship}
                          </Badge>
                          {member.marital_status && (
                            <Badge variant="outline">{member.marital_status}</Badge>
                          )}
                          {member.date_of_birth && (() => {
                            const dob = parse(member.date_of_birth, "yyyy-MM-dd", new Date());
                            if (isValid(dob)) {
                              const age = differenceInYears(new Date(), dob);
                              return (
                                <Badge variant="secondary" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {age} வயது
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {member.phone_number && (
                          <p>📞 {member.phone_number}</p>
                        )}
                        {member.address && (
                          <p className="text-xs">📍 {member.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {member.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberFamilySection;
