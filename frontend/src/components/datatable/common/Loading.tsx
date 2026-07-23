import { Loader } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
      <Loader size={32} className="animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Đang tải...</p>
    </div>
  );
};

export default Loading;
