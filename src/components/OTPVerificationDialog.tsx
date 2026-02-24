import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, RefreshCw, Phone, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OTPVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  phone: string;
  email?: string;
  recipientName: string;
}

const OTPVerificationDialog = ({
  open,
  onClose,
  onVerified,
  phone,
  email,
  recipientName,
}: OTPVerificationDialogProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "email" | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(0);
  const initialSendRef = useRef(false);

  // Send OTP when dialog opens
  useEffect(() => {
    if (open && !initialSendRef.current) {
      initialSendRef.current = true;
      sendOTP();
    }
    
    // Reset state when dialog closes
    if (!open) {
      initialSendRef.current = false;
      setOtp("");
      setError(null);
      setOtpSent(false);
      setCountdown(0);
      setExpiryCountdown(0);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (expiryCountdown > 0) {
      const timer = setTimeout(() => setExpiryCountdown(expiryCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiryCountdown]);

  const sendOTP = async () => {
    setSendingOTP(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("booking-otp", {
        body: {
          action: "send",
          phone,
          email: email || undefined,
          recipientName,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        if (data.rateLimited) {
          setCountdown(60);
        }
        throw new Error(data.error);
      }

      setDeliveryMethod(data.deliveryMethod);
      setOtpSent(true);
      setCountdown(60); // 1 minute before allowing resend
      setExpiryCountdown(data.expiresIn || 600); // 10 minutes

      toast.success(
        data.deliveryMethod === "sms"
          ? "OTP sent to your phone / OTP உங்கள் தொலைபேசிக்கு அனுப்பப்பட்டது"
          : "OTP sent to your email / OTP உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது"
      );
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingOTP(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("booking-otp", {
        body: {
          action: "verify",
          phone,
          otp,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        if (data.maxAttemptsReached) {
          setOtp("");
          setOtpSent(false);
        }
        throw new Error(data.error);
      }

      toast.success("OTP verified successfully / OTP சரிபார்க்கப்பட்டது");
      onVerified();
    } catch (err: any) {
      setError(err.message || "Verification failed");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskedPhone = phone.replace(/(\d{2})\d{4}(\d{4})/, "$1****$2");
  const maskedEmail = email?.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            OTP Verification / OTP சரிபார்ப்பு
          </DialogTitle>
          <DialogDescription className="text-center">
            {otpSent ? (
              <>
                We've sent a 6-digit OTP to{" "}
                {deliveryMethod === "sms" ? (
                  <span className="font-medium">{maskedPhone}</span>
                ) : (
                  <span className="font-medium">{maskedEmail}</span>
                )}
              </>
            ) : (
              "Sending verification code..."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Delivery method indicator */}
          {otpSent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {deliveryMethod === "sms" ? (
                <>
                  <Phone className="h-4 w-4" />
                  <span>Sent via SMS</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>Sent via Email</span>
                </>
              )}
            </div>
          )}

          {/* OTP Input */}
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                setError(null);
              }}
              disabled={loading || sendingOTP || !otpSent}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {/* Expiry countdown */}
            {otpSent && expiryCountdown > 0 && (
              <p className="text-sm text-muted-foreground">
                OTP expires in: <span className="font-medium">{formatTime(expiryCountdown)}</span>
              </p>
            )}

            {expiryCountdown === 0 && otpSent && (
              <p className="text-sm text-destructive">OTP has expired. Please request a new one.</p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Verify button */}
          <Button
            onClick={verifyOTP}
            disabled={otp.length !== 6 || loading || !otpSent || expiryCountdown === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify OTP / OTP சரிபார்க்கவும்"
            )}
          </Button>

          {/* Resend OTP */}
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendOTP}
              disabled={countdown > 0 || sendingOTP}
            >
              {sendingOTP ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend OTP in {countdown}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend OTP / மீண்டும் அனுப்பு
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Didn't receive the code? Check your{" "}
              {deliveryMethod === "email" ? "spam folder" : "SMS inbox"}
            </p>
          </div>

          {/* Cancel button */}
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel / ரத்து செய்
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTPVerificationDialog;
