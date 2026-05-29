import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/I18nContext";

interface Props {
    open: boolean;
    file: File | null;
    onCancel: () => void;
    onCropped: (blob: Blob) => void | Promise<void>;
    /** Disable the save button while the parent is uploading. */
    busy?: boolean;
}

/**
 * Crops an arbitrary picked image to a centered square that ships well as
 * an avatar. Returns a `Blob` (JPEG quality 0.9) so the caller can pass it
 * straight to whatever upload endpoint they use.
 */
export function AvatarCropModal({ open, file, onCancel, onCropped, busy = false }: Props) {
    const { t } = useTranslation();

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);

    // Build & revoke the object URL whenever the picked file changes.
    useEffect(() => {
        if (!file) {
            setImageUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
        setCroppedArea(areaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageUrl || !croppedArea) return;
        const blob = await renderCrop(imageUrl, croppedArea);
        if (blob) await onCropped(blob);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("avatar.cropTitle")}</DialogTitle>
                    <DialogDescription>{t("avatar.cropDescription")}</DialogDescription>
                </DialogHeader>

                <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
                    {imageUrl && (
                        <Cropper
                            image={imageUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    )}
                </div>

                <div className="space-y-1">
                    <label htmlFor="avatar-zoom" className="text-xs text-muted-foreground">
                        {t("avatar.zoom")}
                    </label>
                    <input
                        id="avatar-zoom"
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-primary"
                    />
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                        {t("common.cancel")}
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={busy || !croppedArea}>
                        {busy && <Loader2 size={14} className="mr-2 animate-spin" />}
                        {t("avatar.cropSave")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Render the cropped region of `imageUrl` to a same-size canvas and export
 * as a JPEG blob. Returns null if the image can't be loaded (e.g. CORS).
 */
function renderCrop(imageUrl: string, area: Area): Promise<Blob | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = area.width;
            canvas.height = area.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(
                img,
                area.x,
                area.y,
                area.width,
                area.height,
                0,
                0,
                area.width,
                area.height,
            );
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}
