import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { Link, useLocation } from "react-router-dom";
import {useActiveModuleGroups} from "@/hooks/useSidebarMenus.ts";
import {iconMap} from "@/components/datatable/iconMap";
import {useMemo} from "react";

type Props = {
    pathTitles?: Record<string, string>;
    hasPage?: boolean;
    ignorePaths?: string[];
};

function formatPath(path: string) {
    return path
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DynamicBreadcrumbs({
                                               pathTitles,
                                               hasPage = true,
                                               ignorePaths = [],
                                           }: Props) {
    const location = useLocation();

    const paths = location.pathname
        .split("/")
        .filter(Boolean)
        .filter(
            (p) =>
                !ignorePaths.map((x) => x.toLowerCase()).includes(p.toLowerCase())
        );
    const { data: moduleGroups } = useActiveModuleGroups();

    const activeModule = moduleGroups
        ?.flatMap(group => group.modules)
        ?.find(module => module.url === location.pathname);

    const iconKey: keyof typeof iconMap =
        activeModule?.icon && activeModule.icon in iconMap
            ? (activeModule.icon as keyof typeof iconMap)
            : "menu";

    const Icon = useMemo(() => iconMap[iconKey], [iconKey]);

    if (!Icon) return null;

    return (
        <Breadcrumb>
            <BreadcrumbList className="flex items-center text-sm">
                {paths.map((path, index) => {
                    const href = "/" + paths.slice(0, index + 1).join("/");
                    const isLast = index === paths.length - 1;
                    const title = pathTitles?.[path] ?? formatPath(path);

                    return (
                        <BreadcrumbItem key={href} className="flex items-center">
                            {index > 0 && (
                                <BreadcrumbSeparator className="mx-2 text-muted-foreground">
                                    &gt;
                                </BreadcrumbSeparator>
                            )}

                            {isLast || !hasPage ? (
                                  <div className={"flex gap-2 items-center"}>
                                      <Icon className="text-gray-600" />
                                      <BreadcrumbPage className="text-foreground text-2xl font-bold">
                                          {title}
                                      </BreadcrumbPage>
                                  </div>
                            ) : (
                                <BreadcrumbLink
                                    asChild
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Link to={href}>{title}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
