import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { setAuthState } from "../store/auth-store";
import { updateMe } from "../api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { toast } from "react-hot-toast";
import { 
  User, 
  Mail, 
  Edit3, 
  Save, 
  X,
  Clock,
  Calendar,
  Shield,
  Building
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: user?.fullName || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!editData.fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const updated = await updateMe({ fullName: editData.fullName.trim() });
      setAuthState({ user: updated });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({ fullName: user?.fullName || "" });
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'default';
      case 'STAFF': return 'secondary';
      case 'OFFICE': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleDescription = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'Full system access and user management';
      case 'STAFF': return 'Can manage submissions and reviews';
      case 'OFFICE': return 'Can submit and review office-specific items';
      default: return 'Standard user access';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account details
          </p>
        </div>
        <Button 
          onClick={() => setIsEditing(true)} 
          disabled={isEditing}
          variant="outline"
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="text-2xl">
                    {getInitials(user?.fullName, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {user?.fullName || user?.email?.split('@')[0] || "Unknown User"}
                  </h3>
                  <p className="text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant={getRoleBadgeVariant(user?.role)}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user?.role}
                    </Badge>
                    <Badge variant={user?.isActive ? "default" : "secondary"}>
                      {user?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Member since</span>
                </div>
                <span className="text-sm font-medium">
                  {formatDate(user?.createdAt)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Last login</span>
                </div>
                <span className="text-sm font-medium">
                  {formatDateTime(user?.lastLoginAt)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Office</span>
                </div>
                <span className="text-sm font-medium">
                  {user?.officeName || "Not assigned"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editData.fullName}
                        onChange={(e) => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed. Contact an admin.</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCancel} disabled={loading}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {user?.fullName || "Not provided"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Email Address
                    </Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      User ID
                    </Label>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {user?.id}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Account Status
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <p className="text-sm">
                        {user?.isActive ? "Active Account" : "Inactive Account"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getRoleBadgeVariant(user?.role)} className="text-sm">
                      {user?.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription(user?.role)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}