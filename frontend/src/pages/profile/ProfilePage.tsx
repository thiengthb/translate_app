import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";

import type { RootState } from "@/store/store";
import { updateProfile } from "@/store/slices/auth/authSlice";
import { profileApi } from "@/api/features/profile.api";
import { fileApi } from "@/api/features/file.api";
import type { ProfileResponse } from "@/types/features/profile";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Camera,
  Mail,
  Phone,
  Shield,
  User,
  Lock,
  CalendarDays,
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { formatRoleLabel } from "@/utils/rbac.utils";

// ─── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2, "Tối thiểu 2 ký tự").max(100),
  lastName: z.string().max(100).optional().or(z.literal("")),
  phone: z
    .string()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(500, "Tối đa 500 ký tự").optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Tối thiểu 8 ký tự").max(100),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Avatar Component ──────────────────────────────────────────────────────────

function AvatarSection({
  profile,
  onAvatarChange,
}: {
  profile: ProfileResponse | null;
  onAvatarChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = [profile?.firstName?.charAt(0), profile?.lastName?.charAt(0)]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh phải nhỏ hơn 5MB");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await fileApi.upload(file, "user-avatar", profile?.id, "avatar");
      await profileApi.updateAvatar({ avatarUrl: uploaded.url });
      onAvatarChange(uploaded.url);
      toast.success("Ảnh đại diện đã được cập nhật");
    } catch {
      toast.error("Không thể tải ảnh lên");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative w-fit mx-auto">
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt="Avatar"
          className="h-28 w-28 rounded-full object-cover border-4 border-background shadow-md"
        />
      ) : (
        <div className="h-28 w-28 rounded-full bg-primary/15 flex items-center justify-center text-3xl font-bold text-primary border-4 border-background shadow-md">
          {initials || <User size={40} />}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow cursor-pointer disabled:opacity-60"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { email, firstName, lastName } = useSelector((state: RootState) => state.auth);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", bio: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Load profile
  useEffect(() => {
    profileApi
      .getProfile()
      .then((data) => {
        setProfile(data);
        profileForm.reset({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
          bio: data.bio ?? "",
        });
      })
      .catch(() => {
        // Fallback to redux state
        setProfile({
          id: 0,
          email,
          firstName,
          lastName,
          roles: [],
          createdAt: new Date().toISOString(),
        });
        profileForm.reset({ firstName, lastName: lastName ?? "" });
      })
      .finally(() => setLoading(false));
  }, []);

  const onSaveInfo = async (values: ProfileFormValues) => {
    setSavingInfo(true);
    try {
      const updated = await profileApi.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        phone: values.phone || undefined,
        bio: values.bio || undefined,
      });
      setProfile(updated);
      dispatch(updateProfile({ firstName: updated.firstName, lastName: updated.lastName }));
      setEditingInfo(false);
      toast.success("Thông tin đã được cập nhật");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Không thể cập nhật thông tin");
    } finally {
      setSavingInfo(false);
    }
  };

  const onCancelEdit = () => {
    profileForm.reset({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      phone: profile?.phone ?? "",
      bio: profile?.bio ?? "",
    });
    setEditingInfo(false);
  };

  const onChangePassword = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      await profileApi.changePassword(values);
      passwordForm.reset();
      toast.success("Mật khẩu đã được thay đổi thành công");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Không thể thay đổi mật khẩu");
    } finally {
      setSavingPassword(false);
    }
  };

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Profile Header Card ─────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <AvatarSection
                profile={profile}
                onAvatarChange={(url) => setProfile((p) => p ? { ...p, avatarUrl: url } : p)}
              />

              <div className="flex-1 text-center sm:text-left space-y-2">
                <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground text-sm">
                  <Mail size={14} />
                  <span>{profile?.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground text-sm">
                    <Phone size={14} />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile?.createdAt && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground text-sm">
                    <CalendarDays size={14} />
                    <span>
                      Thành viên từ {format(new Date(profile.createdAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                  {(profile?.roles ?? []).map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs gap-1">
                      <Shield size={11} />
                      {formatRoleLabel(r)}
                    </Badge>
                  ))}
                </div>
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground italic max-w-md mt-2">
                    "{profile.bio}"
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Personal Information ────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật họ tên, số điện thoại và giới thiệu</CardDescription>
            </div>
            {!editingInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingInfo(true)}
                className="gap-1.5"
              >
                <Pencil size={14} />
                Chỉnh sửa
              </Button>
            )}
          </CardHeader>

          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSaveInfo)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!editingInfo} className={!editingInfo ? "bg-muted cursor-default" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!editingInfo} className={!editingInfo ? "bg-muted cursor-default" : ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={profile?.email ?? ""} readOnly className="pl-9 bg-muted cursor-default" />
                  </div>
                  <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
                </div>

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số điện thoại</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="0901 234 567"
                            readOnly={!editingInfo}
                            className={`pl-9 ${!editingInfo ? "bg-muted cursor-default" : ""}`}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới thiệu bản thân</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Viết vài dòng về bản thân..."
                          readOnly={!editingInfo}
                          rows={3}
                          className={`resize-none ${!editingInfo ? "bg-muted cursor-default" : ""}`}
                        />
                      </FormControl>
                      <div className="flex justify-between">
                        <FormMessage />
                        {editingInfo && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(field.value ?? "").length}/500
                          </span>
                        )}
                      </div>
                    </FormItem>
                  )}
                />

                {editingInfo && (
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" disabled={savingInfo} className="gap-1.5">
                      {savingInfo ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Lưu thay đổi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onCancelEdit}
                      disabled={savingInfo}
                      className="gap-1.5"
                    >
                      <X size={14} />
                      Hủy
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Security ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={16} />
              Bảo mật
            </CardTitle>
            <CardDescription>Thay đổi mật khẩu để bảo vệ tài khoản</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu hiện tại</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showCurrentPw ? "text" : "password"}
                            placeholder="••••••••"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu mới</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showNewPw ? "text" : "password"}
                            placeholder="Tối thiểu 8 ký tự"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPw ? "text" : "password"}
                            placeholder="Nhập lại mật khẩu mới"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={savingPassword} className="gap-1.5">
                  {savingPassword ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lock size={14} />
                  )}
                  Đổi mật khẩu
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Account Info ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
            <CardDescription>Chi tiết tài khoản hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">ID tài khoản</span>
              <span className="text-sm font-mono text-foreground">#{profile?.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Trạng thái</span>
              <Badge variant="secondary" className="bg-green-500/15 text-green-600 border-0">
                Đang hoạt động
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Vai trò</span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {(profile?.roles ?? []).map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {formatRoleLabel(r)}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Ngày tham gia</span>
              <span className="text-sm text-foreground">
                {profile?.createdAt
                  ? format(new Date(profile.createdAt), "dd/MM/yyyy HH:mm")
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
