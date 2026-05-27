import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

import { Input } from "@/components/ui/input";

interface Props<TFormValues extends FieldValues> {
    field: ControllerRenderProps<TFormValues, Path<TFormValues>>;
    placeholder?: string;
}

export function PasswordField<TFormValues extends FieldValues>({
    field,
    placeholder = "••••••••",
}: Props<TFormValues>) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <Input
                {...field}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                className="pr-10"
            />
            <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={show ? "Hide password" : "Show password"}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}
