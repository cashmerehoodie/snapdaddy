import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Upload, Loader2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import ManageBillingButton from "@/components/ManageBillingButton";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Profile = () => {
  console.log("[Profile] Component mounting");
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const subscriptionStatus = useSubscription(user);
  
  const [profile, setProfile] = useState<{
    username: string;
    avatar_url: string | null;
  }>({
    username: "",
    avatar_url: null,
  });
  
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem("currency") || "USD";
  });

  const [dateFormat, setDateFormat] = useState<string>(() => {
    return localStorage.getItem("dateFormat") || "DD/MM/YYYY";
  });

  // Image cropping states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);

  useEffect(() => {
    console.log("[Profile] User effect triggered:", !!user);
    const fetchProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      
      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile({
          username: profileData.username || "",
          avatar_url: profileData.avatar_url,
        });
      }
      
      setProfileLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Read file and show crop dialog
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", 0.95);
    });
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels || !user) return;

    setUploading(true);

    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Profile picture updated!");
      setShowCropDialog(false);
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error: any) {
      toast.error(error.message || "Error uploading avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem("currency", value);
    toast.success(`Currency changed to ${value}`);
  };

  const handleDateFormatChange = (value: string) => {
    setDateFormat(value);
    localStorage.setItem("dateFormat", value);
    toast.success(`Date format changed to ${value}`);
  };

  const handleUsernameUpdate = async () => {
    if (!user) return;

    const usernameSchema = z.string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

    try {
      usernameSchema.parse(profile.username);
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Invalid username");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          user_id: user.id,
          username: profile.username 
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Username already taken");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Username updated!");
    } catch (error: any) {
      toast.error(error.message || "Error updating username");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const passwordSchema = z.string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be less than 128 characters")
      .trim();

    const trimmedNewPassword = passwords.newPassword.trim();
    const trimmedConfirmPassword = passwords.confirmPassword.trim();

    try {
      passwordSchema.parse(trimmedNewPassword);
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Invalid password");
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: trimmedNewPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Error updating password");
    } finally {
      setSaving(false);
    }
  };

  console.log("[Profile] Rendering - authLoading:", authLoading, "profileLoading:", profileLoading, "user:", !!user);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[Profile] No user after loading - redirecting to auth");
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-primary-light/10 py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 hover:scale-105 transition-transform duration-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how SnapDaddy looks on your device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="w-full gap-2 hover:scale-105 transition-transform duration-300"
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="w-full gap-2 hover:scale-105 transition-transform duration-300"
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    className="w-full hover:scale-105 transition-transform duration-300"
                  >
                    System
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose between light, dark, or sync with your system settings
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
              <CardDescription>Choose your preferred currency</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">$ USD - US Dollar</SelectItem>
                  <SelectItem value="GBP">£ GBP - British Pound</SelectItem>
                  <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                  <SelectItem value="JPY">¥ JPY - Japanese Yen</SelectItem>
                  <SelectItem value="AUD">A$ AUD - Australian Dollar</SelectItem>
                  <SelectItem value="CAD">C$ CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Date Format</CardTitle>
              <CardDescription>Choose how dates are displayed throughout the app</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={dateFormat} onValueChange={handleDateFormatChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (28/11/2025) - UK/European</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (11/28/2025) - US</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload and crop a profile picture for your account</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32 hover:scale-110 transition-transform duration-300">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Label htmlFor="avatar-upload">
                  <Button
                    variant="outline"
                    disabled={uploading}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Picture
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle>Username</CardTitle>
              <CardDescription>Choose a unique username for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>
              <Button
                onClick={handleUsernameUpdate}
                disabled={saving || !profile.username}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update Username"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  disabled={saving}
                  minLength={6}
                  maxLength={128}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters required
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  disabled={saving}
                />
              </div>
              
              <Button
                onClick={handlePasswordChange}
                disabled={saving || !passwords.newPassword || !passwords.confirmPassword}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300" style={{ animationDelay: '0.6s' }}>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`text-sm font-semibold ${
                    subscriptionStatus.subscribed 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-muted-foreground"
                  }`}>
                    {subscriptionStatus.has_free_access 
                      ? "VIP Access" 
                      : subscriptionStatus.subscribed 
                        ? "Active" 
                        : "Inactive"}
                  </span>
                </div>
                {subscriptionStatus.subscription_status && (
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="text-sm font-medium">Plan:</span>
                    <span className="text-sm">
                      {subscriptionStatus.has_free_access ? "VIP" : "Premium (£5/month)"}
                    </span>
                  </div>
                )}
                {subscriptionStatus.trial_end && (
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="text-sm font-medium">Trial Ends:</span>
                    <span className="text-sm">
                      {new Date(subscriptionStatus.trial_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscriptionStatus.subscription_end && !subscriptionStatus.has_free_access && (
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="text-sm font-medium">Next Billing:</span>
                    <span className="text-sm">
                      {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              {subscriptionStatus.subscribed && !subscriptionStatus.has_free_access && (
                <ManageBillingButton className="w-full" />
              )}
              {!subscriptionStatus.subscribed && !subscriptionStatus.has_free_access && (
                <Button
                  onClick={() => navigate("/subscribe")}
                  className="w-full"
                >
                  Subscribe Now
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crop Profile Picture</DialogTitle>
            </DialogHeader>
            <div className="relative h-96 w-full bg-muted">
              {imageToCrop && (
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Zoom</Label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCropDialog(false);
                  setImageToCrop(null);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={handleCropSave} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Picture"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <footer className="container mx-auto px-4 py-8 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <button 
            onClick={() => navigate("/privacy")}
            className="hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Privacy Policy
          </button>
          <span className="hidden sm:inline">•</span>
          <button 
            onClick={() => navigate("/terms")}
            className="hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Terms of Service
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Profile;
