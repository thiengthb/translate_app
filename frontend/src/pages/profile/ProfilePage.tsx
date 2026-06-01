import { Loader2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { AccountInfoCard } from "./components/AccountInfoCard";
import { IdentityCard } from "./components/IdentityCard";
import { LanguageCard } from "./components/LanguageCard";
import { PersonalInfoCard } from "./components/PersonalInfoCard";
import { SecurityCard } from "./components/SecurityCard";
import { SessionsCard } from "./components/SessionsCard";
import { TwoFactorCard } from "./components/TwoFactorCard";
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
            {/* Uniform 2-column grid: every card is a grid cell so they line
                up in straight rows and columns. Default `items-stretch` makes
                the two cards in each row share the same height. */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <IdentityCard profile={profile} onAvatarChange={setAvatarUrl} />
                <PersonalInfoCard profile={profile} onSave={saveInfo} />
                <AccountInfoCard profile={profile} />
                <SecurityCard onChangePassword={changePassword} />
                <LanguageCard />
                <TwoFactorCard />
                {/* Odd one out — span the full width so the grid doesn't end
                    on a lonely half-row. */}
                <div className="md:col-span-2">
                    <SessionsCard />
                </div>
            </div>
        </MainLayout>
    );
}
