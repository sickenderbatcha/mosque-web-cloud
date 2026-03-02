import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, LogIn, ArrowLeft, UserPlus, Loader2, CreditCard, Phone, KeyRound, Mail, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { z } from "zod";

const loginSchema = z.object({
  memberId: z.string().min(1, "Membership number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  memberId: z.string().min(1, "Membership number is required"),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"request" | "reset">("request");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    memberId: "",
    resetCode: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [changePasswordData, setChangePasswordData] = useState({
    memberId: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [memberDetails, setMemberDetails] = useState<{
    full_name: string;
    phone: string;
  } | null>(null);
  const [memberValidating, setMemberValidating] = useState(false);
  const [formData, setFormData] = useState({
    memberId: "",
    password: "",
    confirmPassword: "",
  });
  
  // Cancel registration state
  const [cancelRegOpen, setCancelRegOpen] = useState(false);
  const [cancelRegLoading, setCancelRegLoading] = useState(false);
  const [cancelRegStep, setCancelRegStep] = useState<"check" | "confirm">("check");
  const [cancelRegData, setCancelRegData] = useState({
    memberId: "",
    phone: "",
  });
  const [pendingRegDetails, setPendingRegDetails] = useState<{
    id: string;
    full_name: string;
    phone: string;
    created_at: string;
  } | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);



  // Special accounts that bypass gb_members validation
  const specialAccounts = ["ADMIN", "SUPUSR"];
  const isSpecialAccount = specialAccounts.includes(formData.memberId.toUpperCase());

  // Fetch member details when membership number changes (for signup)
  useEffect(() => {
    let isCancelled = false;

    if (!isSignUp || formData.memberId.length < 1) {
      setMemberDetails(null);
      setMemberValidating(false);
      return;
    }

    // Bypass validation for special accounts
    if (specialAccounts.includes(formData.memberId.toUpperCase())) {
      setMemberDetails({
        full_name: formData.memberId.toUpperCase() === "SUPUSR" ? "Super Administrator" : "Administrator",
        phone: "0000000000",
      });
      setMemberValidating(false);
      return;
    }

    // Mark as validating immediately (before debounce) to avoid premature "not found" message
    setMemberValidating(true);

    const fetchMemberDetails = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("validate-member", {
          body: { memberId: formData.memberId },
        });

        if (isCancelled) return;

        if (error || !data?.found) {
          setMemberDetails(null);
          return;
        }

        setMemberDetails({
          full_name: data.full_name,
          phone: data.phone,
        });
      } catch {
        if (!isCancelled) {
          setMemberDetails(null);
        }
      } finally {
        if (!isCancelled) {
          setMemberValidating(false);
        }
      }
    };

    const debounce = setTimeout(fetchMemberDetails, 500);
    return () => {
      isCancelled = true;
      clearTimeout(debounce);
    };
  }, [formData.memberId, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate signup
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          toast({
            title: "பிழை / Validation Error",
            description: result.error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // If still validating, wait for it; otherwise re-validate now
        if (memberValidating) {
          toast({
            title: "சரிபார்க்கப்படுகிறது / Validating",
            description: "Please wait while we verify your membership number.",
          });
          setLoading(false);
          return;
        }

        // Re-validate member if details not loaded yet
        if (!memberDetails && !isSpecialAccount) {
          try {
            const { data: revalidateData, error: revalidateError } = await supabase.functions.invoke("validate-member", {
              body: { memberId: formData.memberId },
            });

            if (revalidateError || !revalidateData?.found) {
              toast({
                title: "உறுப்பினர் கிடைக்கவில்லை / Member Not Found",
                description: "Please enter a valid membership number.",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            setMemberDetails({
              full_name: revalidateData.full_name,
              phone: revalidateData.phone,
            });
          } catch {
            toast({
              title: "உறுப்பினர் கிடைக்கவில்லை / Member Not Found",
              description: "Please enter a valid membership number.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        // Check if member already has an auth account (skip for special accounts)
        if (!isSpecialAccount) {
          const { data: validateData } = await supabase.functions.invoke("validate-member", {
            body: { memberId: formData.memberId },
          });

          if (validateData?.has_account) {
            toast({
              title: "கணக்கு ஏற்கனவே உள்ளது / Account Already Exists",
              description: "This membership number already has an account. Please login.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        // Check if already pending
        const { data: existingPending } = await supabase
          .from("pending_users")
          .select("id, status")
          .eq("member_id", formData.memberId)
          .maybeSingle();

        if (existingPending) {
          if (existingPending.status === "pending") {
            toast({
              title: "காத்திருக்கும் ஒப்புதல் / Pending Approval",
              description: "Your registration is pending admin approval. Please wait.",
              variant: "destructive",
            });
          } else if (existingPending.status === "rejected") {
            toast({
              title: "நிராகரிக்கப்பட்டது / Registration Rejected",
              description: "Your previous registration was rejected. Please contact admin.",
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

        // Create pending user registration (password is NOT stored - a temporary password will be generated on approval)
        const { error: insertError } = await supabase
          .from("pending_users")
          .insert({
            member_id: formData.memberId,
            full_name: memberDetails.full_name,
            phone: memberDetails.phone,
          });

        if (insertError) {
          // Handle duplicate key error gracefully
          if (insertError.code === "23505" || insertError.message?.includes("duplicate key") || insertError.message?.includes("pending_users_member_id_key")) {
            toast({
              title: "காத்திருக்கும் ஒப்புதல் / Pending Approval",
              description: "A registration request already exists for this membership number. Please wait for admin approval or contact admin.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw insertError;
        }

        toast({
          title: "பதிவு சமர்ப்பிக்கப்பட்டது! / Registration Submitted!",
          description: "Your registration is pending admin approval. You will be notified once approved.",
        });
        setFormData({ memberId: "", password: "", confirmPassword: "" });
        setIsSignUp(false);
      } else {
        // Validate login
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          toast({
            title: "பிழை / Validation Error",
            description: result.error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Login using generated email format
        const email = `${formData.memberId.toLowerCase()}@mosque.local`;
        const { error } = await signIn(email, formData.password);
        
        if (error) {
          let errorMessage = error.message;
          if (error.message.includes("Invalid login credentials")) {
            errorMessage = "Invalid membership number or password. Please try again.";
          }
          toast({
            title: "உள்நுழைவு தோல்வி / Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          toast({
            title: "உள்நுழைவு வெற்றி! / Login Successful!",
            description: "Welcome back!",
          });
          navigate("/");
        }
      }
    } catch (err: any) {
      toast({
        title: "பிழை / Error",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordLoading(true);

    try {
      // Validate passwords match
      if (changePasswordData.newPassword !== changePasswordData.confirmNewPassword) {
        toast({
          title: "பிழை / Error",
          description: "New passwords don't match",
          variant: "destructive",
        });
        return;
      }

      if (changePasswordData.newPassword.length < 6) {
        toast({
          title: "பிழை / Error",
          description: "New password must be at least 6 characters",
          variant: "destructive",
        });
        return;
      }

      // First sign in with current credentials
      const email = `${changePasswordData.memberId.toLowerCase()}@mosque.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: changePasswordData.currentPassword,
      });

      if (signInError) {
        toast({
          title: "பிழை / Error",
          description: "Invalid membership number or current password",
          variant: "destructive",
        });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: changePasswordData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Sign out after password change
      await supabase.auth.signOut();

      toast({
        title: "வெற்றி! / Success!",
        description: "Password changed successfully. Please login with your new password.",
      });

      setChangePasswordOpen(false);
      setChangePasswordData({
        memberId: "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err: any) {
      toast({
        title: "பிழை / Error",
        description: err.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);

    try {
      if (!forgotPasswordData.memberId) {
        toast({
          title: "பிழை / Error",
          description: "Please enter your membership number",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("request-password-reset", {
        body: { memberId: forgotPasswordData.memberId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "வெற்றி! / Success!",
        description: "If this membership number exists, a reset code has been sent to your registered contact.",
      });

      setForgotPasswordStep("reset");
    } catch (err: any) {
      toast({
        title: "பிழை / Error",
        description: err.message || "Failed to request password reset",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);

    try {
      if (forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword) {
        toast({
          title: "பிழை / Error",
          description: "Passwords don't match",
          variant: "destructive",
        });
        return;
      }

      if (forgotPasswordData.newPassword.length < 6) {
        toast({
          title: "பிழை / Error",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("reset-password", {
        body: { 
          token: forgotPasswordData.resetCode,
          newPassword: forgotPasswordData.newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "வெற்றி! / Success!",
        description: "Password reset successful! Please login with your new password.",
      });

      setForgotPasswordOpen(false);
      setForgotPasswordStep("request");
      setForgotPasswordData({
        memberId: "",
        resetCode: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err: any) {
      toast({
        title: "பிழை / Error",
        description: err.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Handle checking for pending registration and cancelling via edge function
  const handleCheckAndCancelRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelRegLoading(true);

    try {
      if (!cancelRegData.memberId.trim() || !cancelRegData.phone.trim()) {
        toast({
          title: "பிழை / Error",
          description: "Please enter both membership number and phone number",
          variant: "destructive",
        });
        return;
      }

      if (cancelRegStep === "check") {
        // Use edge function to check and verify
        const response = await supabase.functions.invoke("cancel-registration", {
          body: { memberId: cancelRegData.memberId, phone: cancelRegData.phone },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        if (response.data?.error) {
          toast({
            title: "பிழை / Error",
            description: response.data.error,
            variant: "destructive",
          });
          return;
        }

        // Show confirmation before actually cancelling
        if (response.data?.details) {
          setPendingRegDetails({
            id: "",
            full_name: response.data.details.full_name,
            phone: response.data.details.phone,
            created_at: response.data.details.created_at,
          });
          // The edge function already deleted it on success
          toast({
            title: "வெற்றி! / Success!",
            description: "Your registration request has been cancelled. You can now register again.",
          });

          // Reset and close dialog
          setCancelRegOpen(false);
          setCancelRegStep("check");
          setCancelRegData({ memberId: "", phone: "" });
          setPendingRegDetails(null);
        }
      }
    } catch (err: any) {
      toast({
        title: "பிழை / Error",
        description: err.message || "Failed to cancel registration",
        variant: "destructive",
      });
    } finally {
      setCancelRegLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted islamic-pattern">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted islamic-pattern py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-strong">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
              {isSignUp ? (
                <UserPlus className="h-10 w-10 text-primary-foreground" />
              ) : (
                <User className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <CardTitle className="font-tamil text-2xl">
              {isSignUp ? "பதிவு செய்க" : "உள்நுழை"}
            </CardTitle>
            <CardDescription className="font-display">
              {isSignUp ? "Create your account" : "Login to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="memberId" className="font-tamil">
                  உறுப்பினர் எண்
                </Label>
                <div className="relative mt-1">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="memberId"
                    placeholder="Membership Number"
                    className="pl-10"
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              {/* Show member details for signup */}
              {isSignUp && memberDetails && (
                <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{memberDetails.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="text-sm">{memberDetails.phone}</span>
                  </div>
                </div>
              )}

              {isSignUp && formData.memberId && !memberValidating && !memberDetails && (
                <p className="text-sm text-destructive">
                  Member not found. Please enter a valid membership number.
                </p>
              )}

              {!isSignUp && (
                <div>
                  <Label htmlFor="password" className="font-tamil">
                    கடவுச்சொல்
                  </Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  Note: Your registration will require admin approval. A temporary password will be sent to your registered phone number via SMS after approval.
                </p>
              )}

              <div className="flex gap-4 pt-2">
                <Button 
                  type="submit" 
                  variant="default" 
                  size="lg" 
                  className="flex-1" 
                  disabled={loading || (isSignUp && !memberDetails)}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      <span className="font-tamil">{isSignUp ? "பதிவு செய்" : "உள்நுழை"}</span>
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" size="lg" asChild>
                  <Link to="/">
                    <span className="font-tamil">ரத்துசெய்</span>
                  </Link>
                </Button>
              </div>
            </form>

            {/* Toggle between Sign In and Sign Up */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setFormData({ memberId: "", password: "", confirmPassword: "" });
                  setMemberDetails(null);
                }}
                className="text-sm text-primary hover:underline font-tamil"
              >
                {isSignUp
                  ? "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக"
                  : "புதிய கணக்கு உருவாக்க இங்கே கிளிக் செய்க"}
              </button>
            </div>

            {/* Cancel Pending Registration Link - Show in signup mode */}
            {isSignUp && (
              <div className="mt-2 text-center">
                <Dialog 
                  open={cancelRegOpen} 
                  onOpenChange={(open) => {
                    setCancelRegOpen(open);
                    if (!open) {
                      setCancelRegStep("check");
                      setCancelRegData({ memberId: "", phone: "" });
                      setPendingRegDetails(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-destructive hover:underline"
                    >
                      <XCircle className="h-3 w-3 inline mr-1" />
                      Cancel Pending Registration
                    </button>
                  </DialogTrigger>
                   <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-tamil">பதிவு கோரிக்கையை ரத்து செய்</DialogTitle>
                      <DialogDescription>
                        Enter your membership number and registered phone to cancel your pending registration
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCheckAndCancelRegistration} className="space-y-4">
                      <div>
                        <Label htmlFor="cr-memberId">Membership Number</Label>
                        <Input
                          id="cr-memberId"
                          placeholder="Enter your membership number"
                          value={cancelRegData.memberId}
                          onChange={(e) => setCancelRegData({ ...cancelRegData, memberId: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cr-phone">Registered Phone Number</Label>
                        <Input
                          id="cr-phone"
                          placeholder="Enter your phone number"
                          value={cancelRegData.phone}
                          onChange={(e) => setCancelRegData({ ...cancelRegData, phone: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" variant="destructive" className="w-full" disabled={cancelRegLoading}>
                        {cancelRegLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Cancel Registration"
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Change Password Link */}
            {!isSignUp && (
              <div className="mt-2 text-center">
                <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      <KeyRound className="h-3 w-3 inline mr-1" />
                      Change Password
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-tamil">கடவுச்சொல் மாற்று</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new password
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <Label htmlFor="cp-memberId">Membership Number</Label>
                        <Input
                          id="cp-memberId"
                          placeholder="Membership Number"
                          value={changePasswordData.memberId}
                          onChange={(e) => setChangePasswordData({ ...changePasswordData, memberId: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="Current Password"
                          value={changePasswordData.currentPassword}
                          onChange={(e) => setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="New Password (min 6 characters)"
                          value={changePasswordData.newPassword}
                          onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                        <Input
                          id="confirmNewPassword"
                          type="password"
                          placeholder="Confirm New Password"
                          value={changePasswordData.confirmNewPassword}
                          onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmNewPassword: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={changePasswordLoading}>
                        {changePasswordLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Forgot Password Link */}
            {!isSignUp && (
              <div className="mt-2 text-center">
                <Dialog 
                  open={forgotPasswordOpen} 
                  onOpenChange={(open) => {
                    setForgotPasswordOpen(open);
                    if (!open) {
                      setForgotPasswordStep("request");
                      setForgotPasswordData({
                        memberId: "",
                        resetCode: "",
                        newPassword: "",
                        confirmNewPassword: "",
                      });
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      <Mail className="h-3 w-3 inline mr-1" />
                      Forgot Password?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-tamil">கடவுச்சொல் மறந்துவிட்டதா?</DialogTitle>
                      <DialogDescription>
                        {forgotPasswordStep === "request" 
                          ? "Enter your membership number to receive a reset code via SMS/Email"
                          : "Enter the reset code and your new password"
                        }
                      </DialogDescription>
                    </DialogHeader>
                    
                    {forgotPasswordStep === "request" ? (
                      <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                        <div>
                          <Label htmlFor="fp-memberId">Membership Number</Label>
                          <Input
                            id="fp-memberId"
                            placeholder="Membership Number"
                            value={forgotPasswordData.memberId}
                            onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, memberId: e.target.value.toUpperCase() })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                          {forgotPasswordLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Send Reset Code"
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          A reset code will be sent to your registered phone/email.
                        </p>
                      </form>
                    ) : (
                      <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                        <div>
                          <Label htmlFor="resetCode">Reset Code</Label>
                          <Input
                            id="resetCode"
                            placeholder="Enter 8-character code"
                            value={forgotPasswordData.resetCode}
                            onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, resetCode: e.target.value.toUpperCase() })}
                            maxLength={8}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="fp-newPassword">New Password</Label>
                          <Input
                            id="fp-newPassword"
                            type="password"
                            placeholder="New Password (min 6 characters)"
                            value={forgotPasswordData.newPassword}
                            onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, newPassword: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="fp-confirmNewPassword">Confirm New Password</Label>
                          <Input
                            id="fp-confirmNewPassword"
                            type="password"
                            placeholder="Confirm New Password"
                            value={forgotPasswordData.confirmNewPassword}
                            onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, confirmNewPassword: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                          {forgotPasswordLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Reset Password"
                          )}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setForgotPasswordStep("request")}
                          className="text-sm text-primary hover:underline w-full text-center"
                        >
                          ← Request new code
                        </button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}

            <div className="mt-4 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-tamil">முகப்புக்குத் திரும்பு</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 p-4 bg-card rounded-lg shadow-soft text-center"
        >
          <p className="font-tamil text-sm text-muted-foreground">
            உறுப்பினர் அல்லாதவர்களா?{" "}
            <Link to="/donation" className="text-primary hover:underline">
              நன்கொடை வழங்க
            </Link>{" "}
            அல்லது{" "}
            <Link to="/mahal-booking" className="text-primary hover:underline">
              மஹால் முன்பதிவுக்கு
            </Link>{" "}
            உள்நுழைவு தேவையில்லை.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
