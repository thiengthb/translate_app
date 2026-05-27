import { Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { AccountInfoCard } from "./components/AccountInfoCard";
import { IdentityCard } from "./components/IdentityCard";
import { LanguageCard } from "./components/LanguageCard";
import { PersonalInfoCard } from "./components/PersonalInfoCard";
import { SecurityCard } from "./components/SecurityCard";
import { useProfile } from "./useProfile";

export default function ProfilePage() {
    const { profile, loading, setAvatarUrl, saveInfo, changePassword } = useProfile();

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
            <div className="w-full max-w-7xl mx-auto">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <IdentityCard profile={profile} onAvatarChange={setAvatarUrl} />
                    <PersonalInfoCard profile={profile} onSave={saveInfo} />
                    <AccountInfoCard profile={profile} />
                    <SecurityCard onChangePassword={changePassword} />
                    <LanguageCard />
                </div>
            </div>
        </MainLayout>
    );
}
