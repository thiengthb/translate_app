import { ChevronRight, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem
} from "@/components/ui/sidebar";

const STORAGE_KEY = "sidebar-groups-open";

function readGroupState(title: string): boolean {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const map = JSON.parse(raw) as Record<string, boolean>;
            if (title in map) return map[title];
        }
    } catch {}
    return true;
}

function writeGroupState(title: string, open: boolean): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
        map[title] = open;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
}

type NavItem = {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
};

export function NavMain({
    title,
    items,
    sidebarState,
}: {
    title: string;
    items: NavItem[];
    sidebarState: "expanded" | "collapsed";
}) {
    const groupActive = items.some((i) => i.isActive);
    const [isOpen, setIsOpen] = useState(() => readGroupState(title));

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        writeGroupState(title, open);
    };

    /* ================= COLLAPSED =================
       icons only
    ============================================= */
    if (sidebarState !== "expanded") {
        return (
            <>
                {items.map((item) => (
                    <SidebarMenuItem
                        key={item.title}
                        className="flex justify-center"
                    >
                        <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            isActive={item.isActive}
                            className="
                            !p-0
                            flex
                            items-center
                            justify-center

                            data-[active=true]:!bg-primary
                            data-[active=true]:!text-primary-foreground
                        "
                        >
                            <Link
                                to={item.url}
                                className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-[10px]
                                transition-colors
                            "
                            >
                                <item.icon className="h-5 w-5" />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </>
        );
    }

    /* ================= EXPANDED =================
             module group + collapsible
    ============================================= */
    return (
        <Collapsible
            asChild
            open={isOpen}
            onOpenChange={handleOpenChange}
            className="group/collapsible"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={title}
                        isActive={groupActive}
                        className="
                            data-[active=true]:data-[state=closed]:bg-primary
                            data-[active=true]:data-[state=closed]:text-primary-foreground
                        "
                    >
                        <span>{title}</span>
                        <ChevronRight
                            className="
                                ml-auto
                                transition-transform
                                duration-200
                                group-data-[state=open]/collapsible:rotate-90
                            "
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub>
                        {items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={subItem.isActive}
                                    className="
                                        group
                                        data-[active=true]:bg-primary
                                        data-[active=true]:text-primary-foreground
                                    "
                                >
                                    <Link
                                        to={subItem.url}
                                        className="flex items-center gap-2"
                                    >
                                        <subItem.icon className="h-4 w-4 group-data-[active=true]:text-primary-foreground" />
                                        <span>{subItem.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}
