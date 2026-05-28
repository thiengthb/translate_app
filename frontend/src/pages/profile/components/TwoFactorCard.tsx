import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Lock, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { profileApi } from "@/api/features/profile.api";
import { useTranslation } from "@/contexts/I18nContext";
import type { TotpSetupResponse, TotpStatusResponse } from "@/types/features/profile";

type Stage = "idle" | "enrolling" | "showCodes" | "disabling";

export function TwoFactorCard() {
    const { t } = useTranslation();

    const [status, setStatus] = useState<TotpStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [stage, setStage] = useState<Stage>("idle");

    const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [enableError, setEnableError] = useState<string | null>(null);

    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    const [disablePassword, setDisablePassword] = useState("");
    const [disableError, setDisableError] = useState<string | null>(null);

    const refresh = async () => {
        try {
            setStatus(await profileApi.getTotpStatus());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startSetup = async () => {
        setBusy(true);
        try {
            const data = await profileApi.setupTotp();
            setSetupData(data);
            setCode("");
            setEnableError(null);
            setStage("enrolling");
        } catch {
            toast.error(t("twofa.setupFailed"));
        } finally {
            setBusy(false);
        }
    };

    const submitEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setEnableError(null);
        try {
            const res = await profileApi.enableTotp({ code });
            setRecoveryCodes(res.recoveryCodes);
            setStage("showCodes");
            await refresh();
        } catch {
            setEnableError(t("twofa.invalidCode"));
        } finally {
            setBusy(false);
        }
    };

    const submitDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setDisableError(null);
        try {
            await profileApi.disableTotp({ currentPassword: disablePassword });
            toast.success(t("twofa.disableSuccess"));
            setDisablePassword("");
            setStage("idle");
            await refresh();
        } catch {
            setDisableError(t("twofa.disableFailed"));
        } finally {
            setBusy(false);
        }
    };

    const copyCodes = async () => {
        try {
            await navigator.clipboard.writeText(recoveryCodes.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard refused — fall through, codes still visible on screen
        }
    };

    const finishRecovery = () => {
        setStage("idle");
        setSetupData(null);
        setRecoveryCodes([]);
        setCode("");
    };

    const enabled = status?.enabled ?? false;
    const remaining = status?.remainingRecoveryCodes ?? 0;

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    {enabled ? (
                        <ShieldCheck size={16} className="text-primary" />
                    ) : (
                        <ShieldOff size={16} className="text-muted-foreground" />
                    )}
                    {t("twofa.title")}
                </CardTitle>
                <CardDescription>{t("twofa.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                className={
                                    enabled
                                        ? "bg-green-500/15 text-green-600 dark:text-green-400 border-0"
                                        : "bg-muted text-muted-foreground border-0"
                                }
                            >
                                {enabled ? t("twofa.statusEnabled") : t("twofa.statusDisabled")}
                            </Badge>
                            {enabled && remaining > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {t("twofa.recoveryRemaining", { count: remaining })}
                                </span>
                            )}
                        </div>

                        {enabled && remaining > 0 && remaining <= 2 && (
                            <p className="text-xs text-amber-600 dark:text-amber-500">
                                {t("twofa.recoveryLow", { count: remaining })}
                            </p>
                        )}

                        {!enabled && (
                            <Button onClick={startSetup} disabled={busy} className="gap-1.5">
                                {busy ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Lock size={14} />
                                )}
                                {t("twofa.setupButton")}
                            </Button>
                        )}

                        {enabled && (
                            <>
                                <Separator />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStage("disabling")}
                                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <ShieldOff size={14} />
                                    {t("twofa.disableButton")}
                                </Button>
                            </>
                        )}
                    </>
                )}
            </CardContent>

            {/* Step 1 of enrollment — QR + 6-digit code */}
            <Dialog open={stage === "enrolling"} onOpenChange={(v) => { if (!v) setStage("idle"); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("twofa.setupButton")}</DialogTitle>
                        <DialogDescription>{t("twofa.setupSubtitle")}</DialogDescription>
                    </DialogHeader>

                    {setupData && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <img
                                    src={setupData.qrDataUri}
                                    alt="TOTP QR code"
                                    className="h-48 w-48 rounded-md border bg-white p-2"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                {t("twofa.secretFallback")}
                                <br />
                                <code className="font-mono text-foreground select-all">
                                    {setupData.secret}
                                </code>
                            </p>

                            <form onSubmit={submitEnable} className="space-y-3">
                                <label htmlFor="totp-code" className="text-sm font-medium leading-none">
                                    {t("twofa.code")}
                                </label>
                                <Input
                                    id="totp-code"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="\d{6}"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="123456"
                                    className="text-center text-lg tracking-[6px] font-mono"
                                />
                                {enableError && (
                                    <p className="text-sm text-destructive">{enableError}</p>
                                )}
                                <DialogFooter className="gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStage("idle")}
                                        disabled={busy}
                                    >
                                        {t("common.cancel")}
                                    </Button>
                                    <Button type="submit" disabled={busy || code.length !== 6}>
                                        {busy && <Loader2 size={14} className="mr-2 animate-spin" />}
                                        {busy ? t("twofa.enabling") : t("twofa.enableButton")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Step 2 — show recovery codes once */}
            <Dialog open={stage === "showCodes"} onOpenChange={(v) => { if (!v) finishRecovery(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("twofa.recoveryTitle")}</DialogTitle>
                        <DialogDescription>{t("twofa.recoveryDescription")}</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-2 my-2">
                        {recoveryCodes.map((rc) => (
                            <code
                                key={rc}
                                className="font-mono text-sm text-foreground bg-muted rounded-md px-2 py-1.5 text-center select-all"
                            >
                                {rc}
                            </code>
                        ))}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={copyCodes} className="gap-1.5">
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? t("twofa.copied") : t("twofa.copy")}
                        </Button>
                        <Button type="button" onClick={finishRecovery}>
                            {t("twofa.recoveryDone")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disable flow */}
            <Dialog open={stage === "disabling"} onOpenChange={(v) => { if (!v) setStage("idle"); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("twofa.disableTitle")}</DialogTitle>
                        <DialogDescription>{t("twofa.disableConfirm")}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitDisable} className="space-y-3">
                        <Input
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="••••••••"
                            autoFocus
                        />
                        {disableError && (
                            <p className="text-sm text-destructive">{disableError}</p>
                        )}
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStage("idle")}
                                disabled={busy}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                disabled={busy || disablePassword.length === 0}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {busy && <Loader2 size={14} className="mr-2 animate-spin" />}
                                {busy ? t("twofa.disabling") : t("twofa.disableButton")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
